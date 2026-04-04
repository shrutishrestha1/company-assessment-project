const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getSenders, getSenderById, createSender, updateSender, toggleSenderStatus, deleteSender
} = require('../controllers/senderController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/', getSenders);
router.get('/:id', getSenderById);

router.post(
  '/',
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Valid email required.'),
    body('country').optional().trim(),
  ],
  validate,
  createSender
);

router.put(
  '/:id',
  [body('full_name').trim().notEmpty().withMessage('Full name is required.')],
  validate,
  updateSender
);

router.patch(
  '/:id/status',
  [body('is_active').isBoolean().withMessage('is_active must be boolean.')],
  validate,
  toggleSenderStatus
);

router.delete('/:id', deleteSender);

module.exports = router;
