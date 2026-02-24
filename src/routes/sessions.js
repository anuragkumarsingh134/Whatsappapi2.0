const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const userAuth = require('../middleware/userAuth');
const { checkAccountExpiry, checkDeviceLimit } = require('../middleware/quotaValidator');

// Apply userAuth to all routes
router.use(userAuth);

// Apply account expiry check to all routes
router.use(checkAccountExpiry);

// List all sessions for current user
router.get('/', sessionController.listSessions);

// Create new session for current user (with device limit check)
router.post('/', checkDeviceLimit, sessionController.createSession);

// Start session manually
router.post('/:deviceId/start', sessionController.startSession);

// Get session details for current user
router.get('/:deviceId', sessionController.getSessionDetails);

// Get QR code for current user session
router.get('/:deviceId/qr', sessionController.getQRCode);

// Get profile picture for current user session
router.get('/:deviceId/profile-picture', sessionController.getProfilePicture);

// Delete current user session
router.delete('/:deviceId', sessionController.deleteSession);

module.exports = router;
