const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getUsers, getUserById, createUser, updateUser, toggleUserStatus
} = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.get('/', getUsers);
router.get('/:id', getUserById);

router.post(
  '/',
  requireRole('admin'),
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('role').isIn(['admin', 'operator']).withMessage('Role must be admin or operator.'),
  ],
  validate,
  createUser
);

router.put(
  '/:id',
  requireRole('admin'),
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required.'),
    body('role').isIn(['admin', 'operator']).withMessage('Role must be admin or operator.'),
  ],
  validate,
  updateUser
);

router.patch(
  '/:id/status',
  requireRole('admin'),
  [body('is_active').isBoolean().withMessage('is_active must be boolean.')],
  validate,
  toggleUserStatus
);

module.exports = router;
