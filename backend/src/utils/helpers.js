const { v4: uuidv4 } = require('uuid');
const pricing = require('../config/pricing');

const convertJPYtoNPR = (amountJPY) => {
  const rate = pricing.getForexRate();
  return parseFloat((parseFloat(amountJPY) * rate).toFixed(2));
};

/**
 * Calculate full transaction breakdown (uses live forex from env / pricing config).
 */
const calculateTransaction = (sendAmountJPY) => {
  const rate = pricing.getForexRate();
  const convertedAmountNPR = convertJPYtoNPR(sendAmountJPY);
  const serviceFeeNPR = pricing.calculateServiceFee(convertedAmountNPR);
  const totalAmountNPR = parseFloat((convertedAmountNPR + serviceFeeNPR).toFixed(2));

  return {
    sendAmountJPY: parseFloat(sendAmountJPY),
    forexRate: rate,
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
  getForexRate: pricing.getForexRate,
  calculateServiceFee: pricing.calculateServiceFee,
  convertJPYtoNPR,
  calculateTransaction,
  generateReferenceNo,
  generateOTP,
};
