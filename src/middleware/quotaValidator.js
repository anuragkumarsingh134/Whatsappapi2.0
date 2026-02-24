const { getUserQuota, getTodayUsage, getMonthUsage, getTotalStorageUsed, getUserSessionCount, getUserById } = require('../db/database');

/**
 * Middleware to check if user's account has expired
 */
const checkAccountExpiry = (req, res, next) => {
    try {
        const { userId, role } = req.user;

        // Admins are exempt from expiry checks
        if (role === 'admin') {
            return next();
        }

        const quota = getUserQuota(userId);

        // Check if account has expiry and if it's expired
        if (quota && quota.account_expiry) {
            const expiryDate = new Date(quota.account_expiry);
            const now = new Date();

            if (now > expiryDate) {
                return res.status(403).json({
                    success: false,
                    error: 'Account expired',
                    quota: {
                        type: 'account_expiry',
                        expiry_date: quota.account_expiry
                    }
                });
            }
        }

        next();
    } catch (error) {
        // Fail-safe: on error, allow action
        console.error('Error checking account expiry:', error);
        next();
    }
};

/**
 * Middleware to check device/session limit before creating a new session
 */
const checkDeviceLimit = (req, res, next) => {
    try {
        const { userId, role } = req.user;

        // Admins are exempt from device limits
        if (role === 'admin') {
            return next();
        }

        const quota = getUserQuota(userId);

        // Check if user has unlimited quota
        if (quota && quota.is_quota_unlimited) {
            return next();
        }

        const deviceLimit = quota?.device_limit || 5;
        const currentDeviceCount = getUserSessionCount(userId);

        if (currentDeviceCount >= deviceLimit) {
            return res.status(403).json({
                success: false,
                error: 'Device limit reached',
                quota: {
                    type: 'device_limit',
                    limit: deviceLimit,
                    used: currentDeviceCount
                }
            });
        }

        next();
    } catch (error) {
        // Fail-safe: on error, allow action
        console.error('Error checking device limit:', error);
        next();
    }
};

/**
 * Middleware to check message quota before sending a message
 */
const checkMessageQuota = (req, res, next) => {
    try {
        const { userId, role } = req.user;

        // Admins are exempt from message quotas
        if (role === 'admin') {
            return next();
        }

        const quota = getUserQuota(userId);

        // Check if user has unlimited quota
        if (quota && quota.is_quota_unlimited) {
            return next();
        }

        const dailyLimit = quota?.message_quota_daily || 1000;
        const monthlyLimit = quota?.message_quota_monthly || 30000;

        // Check daily quota
        const todayUsage = getTodayUsage(userId);
        const dailyCount = todayUsage?.messages_sent_daily || 0;

        if (dailyCount >= dailyLimit) {
            return res.status(403).json({
                success: false,
                error: 'Daily message quota exceeded',
                quota: {
                    type: 'message_quota_daily',
                    limit: dailyLimit,
                    used: dailyCount
                }
            });
        }

        // Check monthly quota
        const monthUsage = getMonthUsage(userId);
        const monthlyCount = monthUsage?.total_messages || 0;

        if (monthlyCount >= monthlyLimit) {
            return res.status(403).json({
                success: false,
                error: 'Monthly message quota exceeded',
                quota: {
                    type: 'message_quota_monthly',
                    limit: monthlyLimit,
                    used: monthlyCount
                }
            });
        }

        next();
    } catch (error) {
        // Fail-safe: on error, allow action
        console.error('Error checking message quota:', error);
        next();
    }
};

/**
 * Middleware to check storage limit before file upload
 */
const checkStorageLimit = (req, res, next) => {
    try {
        const { userId, role } = req.user;

        // Admins are exempt from storage limits
        if (role === 'admin') {
            return next();
        }

        const quota = getUserQuota(userId);

        // Check if user has unlimited quota
        if (quota && quota.is_quota_unlimited) {
            return next();
        }

        const storageLimit = quota?.storage_limit_mb || 500;
        const currentStorage = getTotalStorageUsed(userId);

        // Get file size from the uploaded file (multer has already processed it)
        const fileSizeMB = req.file ? req.file.size / (1024 * 1024) : 0;
        const projectedStorage = currentStorage + fileSizeMB;

        if (projectedStorage > storageLimit) {
            return res.status(403).json({
                success: false,
                error: 'Storage limit exceeded',
                quota: {
                    type: 'storage_limit',
                    limit: storageLimit,
                    used: currentStorage.toFixed(2),
                    file_size: fileSizeMB.toFixed(2)
                }
            });
        }

        next();
    } catch (error) {
        // Fail-safe: on error, allow action
        console.error('Error checking storage limit:', error);
        next();
    }
};

module.exports = {
    checkAccountExpiry,
    checkDeviceLimit,
    checkMessageQuota,
    checkStorageLimit
};
