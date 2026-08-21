const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/leads', require('./leads.routes'));
router.use('/calls', require('./calls.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/scraper', require('./scraper.routes'));
router.use('/csv-lists', require('./csv-lists.routes'));

module.exports = router;
