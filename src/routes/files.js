const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const fileController = require('../controllers/fileController');
const bearerAuth = require('../middleware/bearerAuth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: timestamp-randomId-originalname
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const safeBasename = basename.replace(/[^a-zA-Z0-9-_]/g, '_');
        const filename = `${timestamp}-${randomId}-${safeBasename}${ext}`;
        cb(null, filename);
    }
});

// File filter - validate file types
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedMimetypes = [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv',
        // Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        // Videos
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'
    ];

    if (allowedMimetypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
};

// Configure multer with size limit and file filter
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB default
    },
    fileFilter: fileFilter
});

// Upload file - multer runs first, then we validate auth
router.post('/upload', upload.single('file'), (req, res, next) => {
    console.log('[File Upload] Request received');
    console.log('[File Upload] Auth header:', req.headers.authorization ? 'Present' : 'MISSING');
    console.log('[File Upload] DeviceId:', req.body.deviceId);
    console.log('[File Upload] File:', req.file ? req.file.filename : 'NO FILE');

    // Now req.body.deviceId is available from multer
    const authHeader = req.headers.authorization;

    // Extract API Key robustly
    let apiKey = null;
    if (authHeader) {
        if (authHeader.toLowerCase().startsWith('bearer ')) {
            apiKey = authHeader.substring(7).trim();
        } else {
            apiKey = authHeader.trim();
        }
    }

    // Fallback to other headers
    if (!apiKey) {
        apiKey = req.headers['x-api-key'] || req.headers['api-key'];
    }

    if (!apiKey) {
        console.log('[File Upload] ERROR: Missing or invalid auth header');
        return res.status(401).json({
            success: false,
            error: 'Missing API key. Please provide Authorization: Bearer <key> or x-api-key header.'
        });
    }

    const deviceId = req.body.deviceId;

    if (!deviceId) {
        return res.status(400).json({
            success: false,
            error: 'deviceId is required'
        });
    }

    // Validate API key against user record
    const { validateUserApiKey, getSession } = require('../db/database');
    const user = validateUserApiKey(apiKey);
    if (!user) {
        console.log('[File Upload] ERROR: Invalid API key');
        return res.status(403).json({
            success: false,
            error: 'Invalid API key'
        });
    }

    // Verify device belongs to user
    const session = getSession(deviceId);
    if (!session || (session.user_id !== null && session.user_id !== user.id && user.role !== 'admin')) {
        console.log('[File Upload] ERROR: Device not found or access denied for device', deviceId);
        return res.status(403).json({
            success: false,
            error: 'Device not found or access denied'
        });
    }

    console.log('[File Upload] Auth successful for device:', deviceId);
    req.user = { userId: user.id, username: user.username, role: user.role };
    req.deviceId = deviceId;
    req.apiKey = apiKey;
    next();
}, fileController.uploadFile);

// List uploaded files (requires Bearer auth)
router.get('/list', bearerAuth, fileController.listFiles);

// Delete file (requires Bearer auth)
router.delete('/:filename', bearerAuth, fileController.deleteFile);

module.exports = router;
