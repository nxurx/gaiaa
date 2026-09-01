const express = require('express');
const router = express.Router();
const {
  uploadCsvList, getCsvLists, getCsvListById, deleteCsvList,
} = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadCsvListSchema } = require('../validators/schemas');

// All CSV list routes require authentication
router.use(authenticate);

// ── CSV Lists (assigned to specific agents) ───────────────────────────────────────
router.post('/:agentId/csv-lists', authorize('admin'), validate(uploadCsvListSchema), uploadCsvList);
router.get('/',                     getCsvLists);           // all authenticated users
router.get('/:listId',              getCsvListById);        // all authenticated users
router.delete('/:listId',          authorize('admin'), deleteCsvList);

module.exports = router;
