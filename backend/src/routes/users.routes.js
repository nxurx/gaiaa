const express = require('express');
const router = express.Router();
const {
  createUser, getUsers, deactivateUser, reactivateUser, deleteUser,
} = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, listQuerySchema } = require('../validators/schemas');

// All user routes require authentication
router.use(authenticate);

// ── User CRUD (admin only) ────────────────────────────────────────────────────
router.post('/',    authorize('admin'), validate(createUserSchema), createUser);
router.get('/',     authorize('admin'), validate(listQuerySchema), getUsers);
router.patch('/:id/deactivate',  authorize('admin'), deactivateUser);
router.patch('/:id/reactivate',  authorize('admin'), reactivateUser);
router.delete('/:id',            authorize('admin'), deleteUser);

module.exports = router;
