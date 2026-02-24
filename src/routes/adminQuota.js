const express = require('express');
const router = express.Router();
const adminQuotaController = require('../controllers/adminQuotaController');

// List all users with quota information
router.get('/users-quotas', adminQuotaController.listUsersWithQuotas);

// Get specific user quota details
router.get('/users/:userId/quotas', adminQuotaController.getUserQuotaDetails);

// Update user quotas
router.put('/users/:userId/quotas', adminQuotaController.updateUserQuotas);

module.exports = router;
