const { getUserQuota, getTodayUsage, getMonthUsage, getTotalStorageUsed, getUserSessionCount } = require('../db/database');

const userQuotaController = {
    // Get current user's quota and usage
    getMyQuota: (req, res) => {
        try {
            const { userId } = req.user;

            const quota = getUserQuota(userId);
            const sessionCount = getUserSessionCount(userId);
            const todayUsage = getTodayUsage(userId);
            const monthUsage = getMonthUsage(userId);
            const storageUsed = getTotalStorageUsed(userId);

            res.json({
                success: true,
                quotas: {
                    device_limit: quota?.device_limit || 5,
                    message_quota_daily: quota?.message_quota_daily || 1000,
                    message_quota_monthly: quota?.message_quota_monthly || 30000,
                    storage_limit_mb: quota?.storage_limit_mb || 500,
                    account_expiry: quota?.account_expiry || null,
                    is_quota_unlimited: quota?.is_quota_unlimited || 0
                },
                usage: {
                    devices_used: sessionCount,
                    messages_today: todayUsage?.messages_sent_daily || 0,
                    messages_this_month: monthUsage?.total_messages || 0,
                    storage_used_mb: parseFloat(storageUsed.toFixed(2))
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = userQuotaController;
