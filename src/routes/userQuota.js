const express = require('express');
const router = express.Router();
const userQuotaController = require('../controllers/userQuotaController');
const userAuth = require('../middleware/userAuth');

// Apply userAuth to all routes
router.use(userAuth);

// Get my quota and usage
router.get('/my-quota', userQuotaController.getMyQuota);

module.exports = router;
