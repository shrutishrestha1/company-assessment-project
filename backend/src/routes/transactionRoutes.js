const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  createTransaction, getTransactions, getTransactionById, calculateFee, getTransactionSummary
} = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/summary', getTransactionSummary);
router.get('/calculate', calculateFee);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);

router.post(
  '/',
  [
    body('sender_id').isInt({ min: 1 }).withMessage('Valid sender_id is required.'),
    body('receiver_id').isInt({ min: 1 }).withMessage('Valid receiver_id is required.'),
    body('send_amount_jpy')
      .isFloat({ min: 0.01 })
      .withMessage('send_amount_jpy must be a positive number.'),
    body('remarks').optional().isLength({ max: 500 }),
  ],
  validate,
  createTransaction
);

module.exports = router;
