const { validateUserApiKey, getSession } = require('../db/database');

const bearerAuth = (req, res, next) => {
    let apiKey = null;

    // 1. Check Authorization header (Bearer)
    const authHeader = req.headers.authorization;
    if (authHeader) {
        if (authHeader.toLowerCase().startsWith('bearer ')) {
            apiKey = authHeader.substring(7).trim();
        } else {
            apiKey = authHeader.trim();
        }
    }

    // 2. Check x-api-key or api-key headers if no Bearer token found
    if (!apiKey) {
        apiKey = req.headers['x-api-key'] || req.headers['api-key'];
    }

    // 3. Fallback to query param
    if (!apiKey && req.query.apiKey) {
        apiKey = req.query.apiKey;
    }

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'Missing API key. Please provide Authorization: Bearer <key> or x-api-key header.'
        });
    }

    // Validate API key against user record
    const user = validateUserApiKey(apiKey);
    if (!user) {
        return res.status(403).json({
            success: false,
            error: 'Invalid API key'
        });
    }

    const deviceId = req.params.deviceId || req.query.deviceId || (req.body && req.body.deviceId);

    if (!deviceId) {
        return res.status(400).json({
            success: false,
            error: 'deviceId is required'
        });
    }

    // Verify that the device belongs to this user
    const session = getSession(deviceId);
    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Device not found'
        });
    }

    if (session.user_id !== null && session.user_id !== user.id && user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'This device does not belong to your account'
        });
    }

    req.user = {
        userId: user.id,
        username: user.username,
        role: user.role
    };
    req.deviceId = deviceId;
    req.apiKey = apiKey;
    next();
};

module.exports = bearerAuth;
