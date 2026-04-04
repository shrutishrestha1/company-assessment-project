const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { sendOTP, verifyOTP, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { otpRateLimit } = require('../middleware/rateLimiter');

router.post(
  '/send-otp',
  otpRateLimit,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required.')],
  validate,
  sendOTP
);

router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits.'),
  ],
  validate,
  verifyOTP
);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
