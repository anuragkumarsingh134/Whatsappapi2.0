const sessionManager = require('../services/sessionManager');
const { validateUserApiKey, getSession, incrementMessageCount } = require('../db/database');

const messageController = {
    // Send message (requires Bearer auth)
    sendMessage: async (req, res) => {
        try {
            const { deviceId } = req;
            const { number, message } = req.body;

            if (!number || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'number and message are required'
                });
            }

            const result = await sessionManager.sendMessage(deviceId, number, message);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Send message via GET (requires API key in query or header)
    sendMessageViaGet: async (req, res) => {
        try {
            const { deviceId, number, message, apiKey } = req.query;

            // Extract API key from query or headers
            let authKey = apiKey;
            if (!authKey && req.headers.authorization) {
                const authHeader = req.headers.authorization;
                if (authHeader.toLowerCase().startsWith('bearer ')) {
                    authKey = authHeader.substring(7).trim();
                } else {
                    authKey = authHeader.trim();
                }
            }
            if (!authKey) {
                authKey = req.headers['x-api-key'] || req.headers['api-key'];
            }

            if (!authKey) {
                return res.status(401).json({
                    success: false,
                    error: 'API key required. Use ?apiKey=YOUR_KEY or Authorization header'
                });
            }

            if (!deviceId || !number || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'deviceId, number, and message are required'
                });
            }

            // Validate API key against user
            const user = validateUserApiKey(authKey);
            if (!user) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid API key'
                });
            }

            // Verify device belongs to user
            const session = getSession(deviceId);
            if (!session || (session.user_id !== null && session.user_id !== user.id && user.role !== 'admin')) {
                return res.status(403).json({
                    success: false,
                    error: 'Device not found or access denied'
                });
            }

            const result = await sessionManager.sendMessage(deviceId, number, message);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Send document (requires Bearer auth)
    sendDocument: async (req, res) => {
        try {
            const { deviceId } = req;
            const { number, url, fileName, mimetype } = req.body;

            if (!number || !url) {
                return res.status(400).json({
                    success: false,
                    error: 'number and url are required'
                });
            }

            const result = await sessionManager.sendDocument(deviceId, number, url, fileName, mimetype);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Send document via GET (requires API key in query or header)
    sendDocumentViaGet: async (req, res) => {
        try {
            const { deviceId, number, url, fileName, mimetype, apiKey } = req.query;

            // Extract API key from query or headers
            let authKey = apiKey;
            if (!authKey && req.headers.authorization) {
                const authHeader = req.headers.authorization;
                if (authHeader.toLowerCase().startsWith('bearer ')) {
                    authKey = authHeader.substring(7).trim();
                } else {
                    authKey = authHeader.trim();
                }
            }
            if (!authKey) {
                authKey = req.headers['x-api-key'] || req.headers['api-key'];
            }

            if (!authKey) {
                return res.status(401).json({
                    success: false,
                    error: 'API key required. Use ?apiKey=YOUR_KEY or Authorization header'
                });
            }

            if (!deviceId || !number || !url) {
                return res.status(400).json({
                    success: false,
                    error: 'deviceId, number, and url are required'
                });
            }

            // Validate API key against user
            const user = validateUserApiKey(authKey);
            if (!user) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid API key'
                });
            }

            // Verify device belongs to user
            const session = getSession(deviceId);
            if (!session || (session.user_id !== null && session.user_id !== user.id && user.role !== 'admin')) {
                return res.status(403).json({
                    success: false,
                    error: 'Device not found or access denied'
                });
            }

            const result = await sessionManager.sendDocument(deviceId, number, url, fileName, mimetype);

            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = messageController;
