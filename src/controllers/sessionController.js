const { createSession: dbCreateSession, getSession: dbGetSession, getAllSessions, deleteSession: dbDeleteSession } = require('../db/database');
const sessionManager = require('../services/sessionManager');
const crypto = require('crypto');

const sessionController = {
    // Start session manually
    startSession: async (req, res) => {
        try {
            const { userId } = req.user;
            const { deviceId } = req.params;

            let session = dbGetSession(deviceId, userId);

            // Allow admin to access any session
            if (!session && req.user.role === 'admin') {
                session = dbGetSession(deviceId);
            }

            if (!session) {
                session = dbGetSession(deviceId);
                if (session && session.user_id !== null && session.user_id !== userId && req.user.role !== 'admin') {
                    return res.status(403).json({ success: false, error: 'Unauthorized access' });
                }
            }

            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            if (sessionManager.getSession(deviceId)) {
                return res.json({ success: true, message: 'Session already running' });
            }

            await sessionManager.createSession(deviceId);

            res.json({ success: true, message: 'Session started' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // List all sessions for current user
    listSessions: (req, res) => {
        try {
            const { userId } = req.user;
            const sessions = getAllSessions(userId);
            const activeSessions = sessionManager.listSessions();

            // Merge database and active session data
            const merged = sessions.map(s => {
                const active = activeSessions.find(a => a.deviceId === s.device_id);
                return {
                    deviceId: s.device_id,
                    connectionState: s.connection_state,
                    hasApiKey: !!s.api_key,
                    phoneNumber: s.phone_number,
                    createdAt: s.created_at,
                    isActive: !!active
                };
            });

            res.json({ success: true, sessions: merged });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Create new session for current user
    createSession: async (req, res) => {
        try {
            const { userId } = req.user;
            const { deviceId } = req.body;

            if (!deviceId) {
                return res.status(400).json({ success: false, error: 'deviceId is required' });
            }

            // Check if session already exists for this device
            const existing = dbGetSession(deviceId);
            if (existing) {
                return res.status(409).json({ success: false, error: 'Session already exists' });
            }

            // Create in database
            dbCreateSession(deviceId, userId);

            // Initialize WhatsApp session
            await sessionManager.createSession(deviceId);

            res.json({
                success: true,
                message: 'Session created',
                deviceId
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get session details for current user
    getSessionDetails: (req, res) => {
        try {
            const { userId } = req.user;
            const { deviceId } = req.params;

            // Try getting by userId first, then fallback to global (for legacy sessions)
            let session = dbGetSession(deviceId, userId);

            // Allow admin to access any session
            if (!session && req.user.role === 'admin') {
                session = dbGetSession(deviceId);
            }

            if (!session) {
                session = dbGetSession(deviceId);
                // If it's a legacy session (user_id is null), allow access.
                // If it belongs to someone else AND we are not admin, block.
                if (session && session.user_id !== null && session.user_id !== userId && req.user.role !== 'admin') {
                    return res.status(403).json({ success: false, error: 'Unauthorized access' });
                }
            }

            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            res.json({
                success: true,
                session: {
                    deviceId: session.device_id,
                    connectionState: session.connection_state,
                    hasApiKey: !!session.api_key,
                    apiKey: session.api_key,
                    api_key: session.api_key, // Fallback
                    phoneNumber: session.phone_number,
                    createdAt: session.created_at
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get QR code for current user session
    getQRCode: async (req, res) => {
        try {
            const { userId } = req.user;
            const { deviceId } = req.params;

            let session = dbGetSession(deviceId, userId);
            if (!session) {
                session = dbGetSession(deviceId);
                if (session && session.user_id !== null) {
                    return res.status(403).json({ success: false, error: 'Unauthorized access' });
                }
            }

            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            const qrData = await sessionManager.getQRCode(deviceId);
            res.json({ success: true, ...qrData });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get profile picture for current user session
    getProfilePicture: async (req, res) => {
        try {
            const { userId } = req.user;
            const { deviceId } = req.params;

            let session = dbGetSession(deviceId, userId);

            // Allow admin to access any session
            if (!session && req.user.role === 'admin') {
                session = dbGetSession(deviceId);
            }

            if (!session) {
                session = dbGetSession(deviceId);
                if (session && session.user_id !== null && session.user_id !== userId && req.user.role !== 'admin') {
                    return res.status(403).json({ success: false, error: 'Unauthorized access' });
                }
            }

            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            const picData = await sessionManager.getProfilePicture(deviceId);
            res.json({ success: true, ...picData });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Delete current user session
    deleteSession: async (req, res) => {
        try {
            const { userId } = req.user;
            const { deviceId } = req.params;

            let session = dbGetSession(deviceId, userId);
            if (!session) {
                session = dbGetSession(deviceId);
                if (session && session.user_id !== null) {
                    return res.status(403).json({ success: false, error: 'Unauthorized access' });
                }
            }

            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            // Logout from WhatsApp
            await sessionManager.deleteSession(deviceId);

            // Delete from database
            dbDeleteSession(deviceId);

            res.json({ success: true, message: 'Session deleted' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = sessionController;
