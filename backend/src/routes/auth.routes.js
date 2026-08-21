const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/schemas');

router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getMe);

module.exports = router;
