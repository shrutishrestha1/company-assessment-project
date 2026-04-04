const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/database');
const { getRedis } = require('../config/redis');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted in Redis
    const redis = getRedis();
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      return errorResponse(res, 'Token has been invalidated. Please log in again.', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.Int, decoded.id)
      .query('SELECT id, uuid, full_name, email, role, is_active FROM users WHERE id = @id');

    if (!result.recordset.length) {
      return errorResponse(res, 'User not found.', 401);
    }

    const user = result.recordset[0];
    if (!user.is_active) {
      return errorResponse(res, 'Your account has been deactivated.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired. Please log in again.', 401);
    }
    logger.error('Auth middleware error:', error);
    return errorResponse(res, 'Authentication failed.', 500);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return errorResponse(res, 'Insufficient permissions.', 403);
  }
  next();
};

module.exports = { authenticate, requireRole };
