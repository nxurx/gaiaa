const express = require('express');
const router = express.Router();
const {
  createLead,
  getLeads,
  getLeadById,
  assignLead,
  updateLeadStatus,
  bulkImportLeads,
} = require('../controllers/leads.controller');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createLeadSchema,
  assignLeadSchema,
  updateLeadStatusSchema,
  listQuerySchema,
  bulkImportLeadsSchema,
} = require('../validators/schemas');

// Public: website form submission
router.post('/', validate(createLeadSchema), createLead);

// Protected routes
router.use(authenticate);

router.get('/', validate(listQuerySchema), getLeads);
router.post('/bulk-import', authenticate, validate(bulkImportLeadsSchema), bulkImportLeads);
router.get('/:id', getLeadById);

router.patch('/:id/assign', authorize('admin'), validate(assignLeadSchema), assignLead);
router.patch('/:id/status', validate(updateLeadStatusSchema), updateLeadStatus);

module.exports = router;
