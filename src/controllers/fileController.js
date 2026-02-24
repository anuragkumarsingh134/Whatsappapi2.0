const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const fileController = {
    // Upload file (requires Bearer auth)
    uploadFile: async (req, res) => {
        try {
            // Check if file was uploaded
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded. Please include a file in the request.'
                });
            }

            const { deviceId } = req;
            const file = req.file;

            // Generate file URL
            const fileUrl = `${req.protocol}://${req.get('host')}/files/${file.filename}`;

            res.json({
                success: true,
                message: 'File uploaded successfully',
                file: {
                    filename: file.filename,
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: fileUrl,
                    deviceId: deviceId
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // List uploaded files (requires Bearer auth)
    listFiles: async (req, res) => {
        try {
            const { deviceId } = req;
            const uploadsDir = path.join(__dirname, '../../uploads');

            // Check if uploads directory exists
            if (!fs.existsSync(uploadsDir)) {
                return res.json({
                    success: true,
                    files: []
                });
            }

            // Read all files from uploads directory
            const files = fs.readdirSync(uploadsDir);

            // Get file details
            const fileDetails = files
                .filter(filename => filename !== 'README.md') // Exclude README
                .map(filename => {
                    const filePath = path.join(uploadsDir, filename);
                    const stats = fs.statSync(filePath);
                    const fileUrl = `${req.protocol}://${req.get('host')}/files/${filename}`;

                    return {
                        filename: filename,
                        size: stats.size,
                        uploadedAt: stats.birthtime,
                        url: fileUrl
                    };
                })
                .sort((a, b) => b.uploadedAt - a.uploadedAt); // Sort by newest first

            res.json({
                success: true,
                files: fileDetails
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Delete file (requires Bearer auth)
    deleteFile: async (req, res) => {
        try {
            const { filename } = req.params;
            const uploadsDir = path.join(__dirname, '../../uploads');
            const filePath = path.join(uploadsDir, filename);

            // Security: Prevent path traversal attacks
            const normalizedPath = path.normalize(filePath);
            if (!normalizedPath.startsWith(uploadsDir)) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid file path'
                });
            }

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'File not found'
                });
            }

            // Delete the file
            fs.unlinkSync(filePath);

            res.json({
                success: true,
                message: 'File deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = fileController;
