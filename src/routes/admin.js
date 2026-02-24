const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminQuotaController = require('../controllers/adminQuotaController');

// Get all users
router.get('/users', adminController.getAllUsers);

// Quota management routes
router.get('/users-quotas', adminQuotaController.listUsersWithQuotas);
router.get('/users/:id/quotas', adminQuotaController.getUserQuotaDetails);
router.put('/users/:id/quotas', adminQuotaController.updateUserQuotas);

// Toggle user verification
router.post('/users/:id/verify', adminController.verifyUser);

// Delete user
router.delete('/users/:id', adminController.deleteUser);

// Get user sessions
router.get('/users/:id/sessions', adminController.getUserSessions);

// Get System Metrics
router.get('/metrics', adminController.getMetrics);

// Get ALL devices across all users
router.get('/devices', adminController.getAllDevices);

// Delete a specific device
router.delete('/devices/:deviceId', adminController.deleteDevice);

module.exports = router;
