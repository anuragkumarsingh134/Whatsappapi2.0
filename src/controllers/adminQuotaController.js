const { getAllUsers, getUserById, getUserQuota, updateUserQuota, getTodayUsage, getMonthUsage, getTotalStorageUsed, getUserSessionCount } = require('../db/database');

const adminQuotaController = {
    // List all users with their quota information
    listUsersWithQuotas: (req, res) => {
        try {
            const users = getAllUsers();

            const usersWithQuotas = users.map(user => {
                const quota = getUserQuota(user.id);
                const sessionCount = getUserSessionCount(user.id);
                const todayUsage = getTodayUsage(user.id);
                const monthUsage = getMonthUsage(user.id);
                const storageUsed = getTotalStorageUsed(user.id);

                return {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    created_at: user.created_at,
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
                        storage_used_mb: storageUsed.toFixed(2)
                    }
                };
            });

            res.json({
                success: true,
                users: usersWithQuotas
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Get specific user quota details and usage
    getUserQuotaDetails: (req, res) => {
        try {
            console.log('[Admin Quota] getUserQuotaDetails called');
            console.log('[Admin Quota] req.params:', req.params);
            const { id: userId } = req.params;
            console.log('[Admin Quota] userId:', userId);
            const user = getUserById(parseInt(userId));

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const quota = getUserQuota(user.id);
            const sessionCount = getUserSessionCount(user.id);
            const todayUsage = getTodayUsage(user.id);
            const monthUsage = getMonthUsage(user.id);
            const storageUsed = getTotalStorageUsed(user.id);

            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    role: user.role,
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
                        storage_used_mb: storageUsed.toFixed(2)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    // Update user quotas
    updateUserQuotas: (req, res) => {
        try {
            const { id: userId } = req.params;
            const user = getUserById(parseInt(userId));

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const { device_limit, message_quota_daily, message_quota_monthly, storage_limit_mb, account_expiry, is_quota_unlimited } = req.body;

            const quotas = {};
            if (device_limit !== undefined) quotas.device_limit = device_limit;
            if (message_quota_daily !== undefined) quotas.message_quota_daily = message_quota_daily;
            if (message_quota_monthly !== undefined) quotas.message_quota_monthly = message_quota_monthly;
            if (storage_limit_mb !== undefined) quotas.storage_limit_mb = storage_limit_mb;
            if (account_expiry !== undefined) quotas.account_expiry = account_expiry;
            if (is_quota_unlimited !== undefined) quotas.is_quota_unlimited = is_quota_unlimited;

            const result = updateUserQuota(user.id, quotas);

            res.json({
                success: true,
                message: 'User quotas updated successfully',
                changes: result.changes
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = adminQuotaController;
