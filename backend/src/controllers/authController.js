const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/database');
const { getRedis } = require('../config/redis');
const { sendOTPEmail } = require('../services/emailService');
const { generateOTP } = require('../utils/helpers');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES) || 5;
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH) || 6;

/** Local-only: skip SMTP; use DB/Redis as normal. Requires NODE_ENV=development. Never enable in production. */
const isLocalDevDummyAuth = () =>
  process.env.NODE_ENV === 'development' &&
  process.env.LOCAL_DEV_DUMMY_AUTH === 'true';

const pickDevFixedOtp = () => {
  const raw = (process.env.DEV_FIXED_OTP || '').replace(/\D/g, '');
  return raw.length === OTP_LENGTH ? raw : null;
};

const isSqlUniqueViolation = (err) => {
  const n = err?.number ?? err?.originalError?.number ?? err?.info?.number;
  if (n === 2627 || n === 2601) return true;
  const msg = (err?.message || '').toUpperCase();
  return msg.includes('UNIQUE') && (msg.includes('USERS') || msg.includes('EMAIL'));
};

/** Display name from email local-part for auto-provisioned users */
const fullNameFromEmail = (normalizedEmail) => {
  const local = (normalizedEmail.split('@')[0] || 'user').replace(/[._-]+/g, ' ').trim();
  if (!local) return 'User';
  return local.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 100);
};

/**
 * Load user or create one when AUTO_PROVISION_USERS=true (any email can sign in).
 */
const ensureUserForOtp = async (pool, rawEmail) => {
  const normalized = rawEmail.toLowerCase().trim();

  let rs = await pool.request()
    .input('email', sql.NVarChar, normalized)
    .query('SELECT id, full_name, email, is_active FROM users WHERE email = @email');

  if (rs.recordset.length) return rs.recordset[0];

  if (process.env.AUTO_PROVISION_USERS !== 'true') return null;

  const roleRaw = (process.env.AUTO_PROVISION_ROLE || 'operator').toLowerCase();
  const role = roleRaw === 'admin' ? 'admin' : 'operator';
  const fullName = fullNameFromEmail(normalized);

  try {
    await pool.request()
      .input('full_name', sql.NVarChar, fullName)
      .input('email', sql.NVarChar, normalized)
      .input('role', sql.NVarChar, role)
      .query(
        'INSERT INTO users (full_name, email, role, is_active) VALUES (@full_name, @email, @role, 1)'
      );
    logger.info(`Auto-provisioned user ${normalized} (role=${role})`);
  } catch (err) {
    if (!isSqlUniqueViolation(err)) throw err;
    logger.warn(`ensureUserForOtp: concurrent create for ${normalized}`);
  }

  rs = await pool.request()
    .input('email', sql.NVarChar, normalized)
    .query('SELECT id, full_name, email, is_active FROM users WHERE email = @email');

  return rs.recordset[0] || null;
};

// POST /api/auth/send-otp
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const pool = getPool();

    const user = await ensureUserForOtp(pool, email);
    if (!user) {
      return errorResponse(res, 'No account found with this email address.', 404);
    }

    if (!user.is_active) {
      return errorResponse(res, 'Your account has been deactivated. Contact administrator.', 403);
    }

    // Invalidate previous unused OTPs
    await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .query('UPDATE otps SET is_used = 1 WHERE email = @email AND is_used = 0');

    const dummyLocal = isLocalDevDummyAuth();
    const fixed = pickDevFixedOtp();
    const otp =
      dummyLocal && fixed ? fixed : generateOTP(OTP_LENGTH);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    // Store OTP in DB
    await pool.request()
      .input('email', sql.NVarChar, email.toLowerCase().trim())
      .input('otp_code', sql.NVarChar, otp)
      .input('expires_at', sql.DateTime2, expiresAt)
      .query('INSERT INTO otps (email, otp_code, expires_at) VALUES (@email, @otp_code, @expires_at)');

    // Also store in Redis as cache
    const redis = getRedis();
    await redis.setex(`otp:${email.toLowerCase()}`, OTP_EXPIRES_MINUTES * 60, otp);

    if (dummyLocal) {
      logger.warn(`[LOCAL_DEV_DUMMY_AUTH] Email skipped. OTP for ${email}: ${otp}`);
    } else {
      await sendOTPEmail(email, otp, OTP_EXPIRES_MINUTES);
    }

    logger.info(dummyLocal ? `OTP ready (local dummy) for ${email}` : `OTP sent to ${email}`);
    const payload = { email, expiresMinutes: OTP_EXPIRES_MINUTES };
    if (dummyLocal) payload.devOtp = otp;
    return successResponse(
      res,
      payload,
      dummyLocal
        ? 'Local dev: email skipped — use the code shown below.'
        : 'OTP sent to your email address.'
    );
  } catch (error) {
    logger.error('sendOTP error:', error);
    const msg = (error.message || '').toLowerCase();
    if (
      msg.includes('535') ||
      msg.includes('badcredentials') ||
      msg.includes('invalid login')
    ) {
      return errorResponse(
        res,
        'Gmail rejected the password. Create an App Password: Google Account → Security → turn on 2-Step Verification → App passwords → generate one for Mail, then put only that 16-character password in EMAIL_PASS (not your normal Gmail password).',
        502
      );
    }
    return errorResponse(res, 'Failed to send OTP. Please try again.', 500);
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const pool = getPool();
    const redis = getRedis();

    const normalizedEmail = email.toLowerCase().trim();

    // Check Redis cache first
    const cachedOTP = await redis.get(`otp:${normalizedEmail}`);

    let isValid = false;

    if (cachedOTP && cachedOTP === otp) {
      isValid = true;
    } else {
      // Fallback to DB check
      const otpResult = await pool.request()
        .input('email', sql.NVarChar, normalizedEmail)
        .input('otp', sql.NVarChar, otp)
        .query(`
          SELECT TOP 1 id, expires_at FROM otps
          WHERE email = @email AND otp_code = @otp AND is_used = 0
          ORDER BY created_at DESC
        `);

      if (otpResult.recordset.length) {
        const record = otpResult.recordset[0];
        if (new Date(record.expires_at) > new Date()) {
          isValid = true;
        }
      }
    }

    if (!isValid) {
      return errorResponse(res, 'Invalid or expired OTP. Please request a new one.', 400);
    }

    // Mark OTP used in DB
    await pool.request()
      .input('email', sql.NVarChar, normalizedEmail)
      .input('otp', sql.NVarChar, otp)
      .query('UPDATE otps SET is_used = 1 WHERE email = @email AND otp_code = @otp AND is_used = 0');

    // Delete from Redis
    await redis.del(`otp:${normalizedEmail}`);

    // Get user
    const userResult = await pool.request()
      .input('email', sql.NVarChar, normalizedEmail)
      .query('SELECT id, uuid, full_name, email, role, is_active FROM users WHERE email = @email');

    const user = userResult.recordset[0];

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`User ${user.email} logged in successfully`);
    return successResponse(res, {
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role },
    }, 'Login successful.');
  } catch (error) {
    logger.error('verifyOTP error:', error);
    return errorResponse(res, 'Verification failed. Please try again.', 500);
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      const redis = getRedis();
      const decoded = jwt.decode(token);
      const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
      if (ttl > 0) await redis.setex(`blacklist:${token}`, ttl, '1');
    }
    return successResponse(res, null, 'Logged out successfully.');
  } catch (error) {
    logger.error('logout error:', error);
    return errorResponse(res, 'Logout failed.', 500);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  return successResponse(res, req.user, 'User profile fetched.');
};

module.exports = { sendOTP, verifyOTP, logout, getMe };
