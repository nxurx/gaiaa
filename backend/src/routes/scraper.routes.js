const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/googlePlacesScraper.controller');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// All scraper routes require authentication and admin role
router.use(authenticate);
router.use(authorizeAdmin);

// Start scraping job (Server-Sent Events for progress)
router.post('/start', scraperController.startScraping);

// Export results to CSV
router.post('/export-csv', scraperController.exportToCSV);

module.exports = router;
