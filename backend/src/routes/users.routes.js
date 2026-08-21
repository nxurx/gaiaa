const express = require('express');
const router = express.Router();
const {
  createUser, getUsers, deactivateUser, reactivateUser, deleteUser,
  uploadCsvList, getCsvLists, getCsvListById, deleteCsvList,
} = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserSchema, listQuerySchema, uploadCsvListSchema } = require('../validators/schemas');

// All user routes require authentication
router.use(authenticate);

// ── User CRUD (admin only) ────────────────────────────────────────────────────
router.post('/',    authorize('admin'), validate(createUserSchema), createUser);
router.get('/',     authorize('admin'), validate(listQuerySchema), getUsers);
router.patch('/:id/deactivate',  authorize('admin'), deactivateUser);
router.patch('/:id/reactivate',  authorize('admin'), reactivateUser);
router.delete('/:id',            authorize('admin'), deleteUser);

// ── CSV Lists ─────────────────────────────────────────────────────────────────
// Admin uploads a list to an agent; agent (or admin) can read their own lists
router.post(  '/:id/csv-lists',          authorize('admin'), validate(uploadCsvListSchema), uploadCsvList);
router.get(   '/:id/csv-lists',          getCsvLists);           // admin or agent (self)
router.get(   '/:id/csv-lists/:listId',  getCsvListById);        // admin or agent (self)
router.delete('/:id/csv-lists/:listId',  authorize('admin'), deleteCsvList);

module.exports = router;
