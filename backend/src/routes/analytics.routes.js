const express = require('express');
const router = express.Router();
const { getOverview, getUserAnalytics } = require('../controllers/analytics.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/overview', getOverview);
router.get('/user/:id', getUserAnalytics);

module.exports = router;
