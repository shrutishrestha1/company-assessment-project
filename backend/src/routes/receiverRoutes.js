const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getReceivers, getReceiverById, createReceiver, updateReceiver, toggleReceiverStatus, deleteReceiver
} = require('../controllers/receiverController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/', getReceivers);
router.get('/:id', getReceiverById);

router.post(
  '/',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.'),
    body('phone').trim().notEmpty().withMessage('Phone number is required.'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  ],
  validate,
  createReceiver
);

router.put(
  '/:id',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.'),
    body('phone').trim().notEmpty().withMessage('Phone number is required.'),
  ],
  validate,
  updateReceiver
);

router.patch(
  '/:id/status',
  [body('is_active').isBoolean().withMessage('is_active must be boolean.')],
  validate,
  toggleReceiverStatus
);

router.delete('/:id', deleteReceiver);

module.exports = router;
