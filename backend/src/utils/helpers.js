const { v4: uuidv4 } = require('uuid');

// Forex rate: 1 JPY = 0.92 NPR
const FOREX_RATE = 0.92;

/**
 * Calculate service fee based on converted NPR amount
 * NPR 500  for 0 – 100,000
 * NPR 1,000 for 100,000.01 – 200,000
 * NPR 3,000 for above 200,000
 */
const calculateServiceFee = (amountNPR) => {
  if (amountNPR <= 100000) return 500;
  if (amountNPR <= 200000) return 1000;
  return 3000;
};

/**
 * Convert JPY to NPR
 */
const convertJPYtoNPR = (amountJPY) => {
  return parseFloat((amountJPY * FOREX_RATE).toFixed(2));
};

/**
 * Calculate full transaction breakdown
 */
const calculateTransaction = (sendAmountJPY) => {
  const convertedAmountNPR = convertJPYtoNPR(sendAmountJPY);
  const serviceFeeNPR = calculateServiceFee(convertedAmountNPR);
  const totalAmountNPR = parseFloat((convertedAmountNPR + serviceFeeNPR).toFixed(2));

  return {
    sendAmountJPY: parseFloat(sendAmountJPY),
    forexRate: FOREX_RATE,
    convertedAmountNPR,
    serviceFeeNPR,
    totalAmountNPR,
  };
};

/**
 * Generate unique reference number
 * Format: RMT-YYYYMMDD-XXXXXXXX
 */
const generateReferenceNo = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `RMT-${dateStr}-${random}`;
};

/**
 * Generate OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

module.exports = {
  FOREX_RATE,
  calculateServiceFee,
  convertJPYtoNPR,
  calculateTransaction,
  generateReferenceNo,
  generateOTP,
};
