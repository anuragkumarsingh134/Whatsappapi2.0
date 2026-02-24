const { db, getAllSessions } = require('../db/database');
const os = require('os');

// Helper to get system metrics
const getSystemMetrics = () => {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();

    return {
        cpuCount: cpus.length,
        cpuModel: cpus[0].model,
        totalMemory: totalMem,
        usedMemory: usedMem,
        freeMemory: freeMem,
        uptime: uptime,
        platform: os.platform(),
        processMemory: process.memoryUsage()
    };
};

const adminController = {
    // Get all users
    getAllUsers: (req, res) => {
        try {
            const users = db.prepare('SELECT id, username, role, is_verified, created_at FROM users ORDER BY created_at DESC').all();
            res.json({ success: true, users });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Toggle user verification
    verifyUser: (req, res) => {
        try {
            const { id } = req.params;
            const { is_verified } = req.body;

            db.prepare('UPDATE users SET is_verified = ? WHERE id = ?').run(is_verified ? 1 : 0, id);

            res.json({ success: true, message: `User ${is_verified ? 'verified' : 'unverified'}` });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Delete user
    deleteUser: (req, res) => {
        try {
            const { id } = req.params;
            // Prevent deleting self
            if (parseInt(id) === req.user.userId) {
                return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
            }

            db.prepare('DELETE FROM users WHERE id = ?').run(id);
            res.json({ success: true, message: 'User deleted' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get user sessions
    getUserSessions: (req, res) => {
        try {
            const { id } = req.params;
            const sessions = getAllSessions(id);
            res.json({ success: true, sessions });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get System Metrics
    getMetrics: (req, res) => {
        try {
            const metrics = getSystemMetrics();
            // Also get some app stats
            const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
            const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

            res.json({
                success: true,
                metrics: {
                    ...metrics,
                    appStats: {
                        sessions: sessionCount,
                        users: userCount
                    }
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get ALL devices/sessions across ALL users
    getAllDevices: (req, res) => {
        try {
            const devices = db.prepare(`
                SELECT 
                    s.device_id,
                    s.user_id,
                    s.phone_number,
                    s.connection_state,
                    s.created_at,
                    u.username
                FROM sessions s
                LEFT JOIN users u ON s.user_id = u.id
                ORDER BY s.created_at DESC
            `).all();

            res.json({ success: true, devices });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Delete a device/session by device_id
    deleteDevice: async (req, res) => {
        try {
            const { deviceId } = req.params;

            // First logout the session if active
            const sessionManager = require('../services/sessionManager');
            try {
                await sessionManager.deleteSession(deviceId);
            } catch (e) {
                console.log(`[Admin] Session ${deviceId} not active in memory`);
            }

            // Delete from database
            db.prepare('DELETE FROM auth_state WHERE device_id = ?').run(deviceId);
            db.prepare('DELETE FROM sessions WHERE device_id = ?').run(deviceId);

            res.json({ success: true, message: `Device ${deviceId} deleted successfully` });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = adminController;
