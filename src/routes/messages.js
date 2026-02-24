const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const bearerAuth = require('../middleware/bearerAuth');
const { checkMessageQuota } = require('../middleware/quotaValidator');

// Send message (requires Bearer auth + message quota check)
router.post('/send', bearerAuth, checkMessageQuota, messageController.sendMessage);

// Send message via GET (requires Bearer auth in query or header + quota check)
router.get('/send', bearerAuth, checkMessageQuota, messageController.sendMessageViaGet);

// Send document (requires Bearer auth + message quota check)
router.post('/send-file', bearerAuth, checkMessageQuota, messageController.sendDocument);

// Send document via GET (requires Bearer auth in query or header + quota check)
router.get('/send-file', bearerAuth, checkMessageQuota, messageController.sendDocumentViaGet);

module.exports = router;
