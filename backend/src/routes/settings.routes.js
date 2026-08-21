const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// All settings routes require authentication
router.use(authenticate);

// Get effective settings for current user
router.get('/me', settingsController.getMySettings);

// Admin-only routes
router.get('/', authorizeAdmin, settingsController.getSettings);
router.patch('/', authorizeAdmin, settingsController.updateSettings);
router.patch('/overrides', authorizeAdmin, settingsController.setUserOverride);
router.delete('/overrides', authorizeAdmin, settingsController.clearUserOverride);
router.post('/test-discord', authorizeAdmin, settingsController.testDiscord);
router.post('/notify', settingsController.sendNotification);

module.exports = router;
