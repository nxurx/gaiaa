const express = require('express');
const router = express.Router();
const { createCall, getCalls } = require('../controllers/calls.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCallSchema, listQuerySchema } = require('../validators/schemas');

router.use(authenticate);

router.post('/', validate(createCallSchema), createCall);
router.get('/', validate(listQuerySchema), getCalls);

module.exports = router;
