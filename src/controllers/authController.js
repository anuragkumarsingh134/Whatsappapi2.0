const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createUser, getUserByUsername, updateUser, getUserById, getAllUsers, updateUserQuota, setUserApiKey, getUserApiKey } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123';

const authController = {
    // Register a new user
    signup: async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Username and password are required' });
            }

            const existingUser = getUserByUsername(username);
            if (existingUser) {
                return res.status(400).json({ success: false, error: 'Username already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Check if this is the first user
            const allUsers = getAllUsers();

            if (allUsers.length === 0) {
                // First user becomes admin and is auto-verified
                createUser(username, hashedPassword, 'admin', 1);
                res.json({ success: true, message: 'Admin account created successfully. You can now log in.' });
            } else {
                // Subsequent users are auto-verified clients with trial quota
                const result = createUser(username, hashedPassword, 'client', 1); // Auto-verified
                const newUserId = result.lastInsertRowid;

                // Assign trial quota: 1 device, 100 messages, 3 days trial
                const trialExpiryDate = new Date();
                trialExpiryDate.setDate(trialExpiryDate.getDate() + 3);

                updateUserQuota(newUserId, {
                    device_limit: 1,
                    message_quota_daily: 100,
                    message_quota_monthly: 100,
                    storage_limit_mb: 50,
                    account_expiry: trialExpiryDate.toISOString().split('T')[0],
                    is_quota_unlimited: 0
                });

                res.json({
                    success: true,
                    message: 'Account created successfully! You can now log in. (3-day trial: 1 device, 100 messages)'
                });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Login user
    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ success: false, error: 'Username and password are required' });
            }

            const user = getUserByUsername(username);
            if (!user) {
                return res.status(401).json({ success: false, error: 'Invalid username or password' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, error: 'Invalid username or password' });
            }

            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Update Profile
    updateProfile: async (req, res) => {
        try {
            const { userId } = req.user;
            const { name, email, username, password } = req.body;

            const updates = {};
            if (name !== undefined) updates.name = name;
            if (email !== undefined) updates.email = email;
            if (username !== undefined) {
                // Check uniqueness if changing username
                const existing = getUserByUsername(username);
                if (existing && existing.id !== userId) {
                    return res.status(400).json({ success: false, error: 'Username already taken' });
                }
                updates.username = username;
            }
            if (password) {
                updates.password = await bcrypt.hash(password, 10);
            }

            updateUser(userId, updates);

            // Return updated user info (without password)
            const updatedUser = getUserById(userId);

            res.json({
                success: true,
                message: 'Profile updated',
                user: {
                    id: updatedUser.id,
                    username: updatedUser.username,
                    role: updatedUser.role,
                    name: updatedUser.name,
                    email: updatedUser.email
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Get API key for current user
    getApiKey: (req, res) => {
        try {
            const { userId } = req.user;
            const apiKey = getUserApiKey(userId);

            res.json({
                success: true,
                hasApiKey: !!apiKey,
                apiKey: apiKey || null
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // Generate/Update API key for current user
    updateApiKey: (req, res) => {
        try {
            const { userId } = req.user;
            let { apiKey } = req.body;

            // Generate API key if not provided
            if (!apiKey) {
                apiKey = crypto.randomBytes(16).toString('hex');
            }

            setUserApiKey(userId, apiKey);

            res.json({
                success: true,
                message: 'API key updated',
                apiKey
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = authController;
