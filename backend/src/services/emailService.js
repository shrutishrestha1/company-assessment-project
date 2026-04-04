const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

const getAuth = () => {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').replace(/\s/g, '').trim();
  return { user, pass };
};

const getTransporter = () => {
  if (!transporter) {
    const { user, pass } = getAuth();
    const host = (process.env.EMAIL_HOST || 'smtp.gmail.com').toLowerCase();

    if (host.includes('gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT, 10) || 587,
        secure: false,
        requireTLS: true,
        auth: { user, pass },
      });
    }
  }
  return transporter;
};

const sendOTPEmail = async (email, otp, expiresMinutes = 5) => {
  try {
    if (process.env.OTP_LOG_ONLY === 'true') {
      logger.warn(
        `[OTP_LOG_ONLY] OTP for ${email}: ${otp} (expires in ${expiresMinutes} min) — use this code to log in`
      );
      return true;
    }

    const transport = getTransporter();
    const fromRaw = (process.env.EMAIL_FROM || '').trim();
    const from =
      fromRaw.includes('<') && fromRaw.includes('>')
        ? fromRaw
        : fromRaw
          ? `RemitApp <${fromRaw}>`
          : 'RemitApp <noreply@remitapp.com>';

    const mailOptions = {
      from,
      to: email,
      subject: '🔐 Your RemitApp Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1a1a2e; font-size: 28px; margin: 0;">RemitApp</h1>
            <p style="color: #6b7280; margin: 4px 0;">Japan → Nepal Money Transfer</p>
          </div>
          <div style="background: #ffffff; border-radius: 8px; padding: 32px; text-align: center; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Your One-Time Password is:</p>
            <div style="background: #1a1a2e; color: #f59e0b; font-size: 42px; font-weight: bold; letter-spacing: 12px; padding: 20px; border-radius: 8px; margin: 16px 0;">
              ${otp}
            </div>
            <p style="color: #9ca3af; font-size: 14px;">This OTP expires in <strong>${expiresMinutes} minutes</strong>.</p>
            <p style="color: #ef4444; font-size: 13px; margin-top: 16px;">⚠️ Never share this OTP with anyone.</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };

    const info = await transport.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send OTP email to ${email}:`, error.message);
    throw error;
  }
};

module.exports = { sendOTPEmail };
