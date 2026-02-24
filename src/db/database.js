const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../whatsapp.db');
const db = new Database(DB_PATH);

// Initialize database schema
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT,
        email TEXT,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'client',
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE NOT NULL,
        connection_state TEXT DEFAULT 'disconnected' CHECK(connection_state IN ('disconnected', 'waiting_qr', 'connected')),
        api_key TEXT,
        phone_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_state (
        device_id TEXT NOT NULL,
        key_name TEXT NOT NULL,
        key_value TEXT NOT NULL,
        PRIMARY KEY (device_id, key_name),
        FOREIGN KEY (device_id) REFERENCES sessions(device_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS usage_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        messages_sent_daily INTEGER DEFAULT 0,
        messages_sent_monthly INTEGER DEFAULT 0,
        storage_used_mb REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, date)
    );
`);

// Migration: Add user_id to sessions if it doesn't exist
try {
    db.exec('ALTER TABLE sessions ADD COLUMN user_id INTEGER');
} catch (e) {
    // Column already exists or other error
}

// Migration: Add role and is_verified to users if they don't exist
try {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'client'");
    db.exec("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 1");
} catch (e) {
    // Columns already exist
}

// Migration: Add name and email to users if they don't exist
try {
    db.exec("ALTER TABLE users ADD COLUMN name TEXT");
    db.exec("ALTER TABLE users ADD COLUMN email TEXT");
} catch (e) {
    // Columns already exist
}

// Migration: Add quota management columns to users
try {
    db.exec("ALTER TABLE users ADD COLUMN device_limit INTEGER DEFAULT 5");
    db.exec("ALTER TABLE users ADD COLUMN message_quota_daily INTEGER DEFAULT 1000");
    db.exec("ALTER TABLE users ADD COLUMN message_quota_monthly INTEGER DEFAULT 30000");
    db.exec("ALTER TABLE users ADD COLUMN storage_limit_mb INTEGER DEFAULT 500");
    db.exec("ALTER TABLE users ADD COLUMN account_expiry TEXT");
    db.exec("ALTER TABLE users ADD COLUMN is_quota_unlimited INTEGER DEFAULT 0");
} catch (e) {
    // Columns already exist
}

// Migration: Add api_key to users table (per-user API key instead of per-device)
try {
    db.exec("ALTER TABLE users ADD COLUMN api_key TEXT");
} catch (e) {
    // Column already exists
}


// No longer needed - first user signup becomes admin automatically

// Create indexes after migration
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_auth_state_device ON auth_state(device_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(connection_state);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_stats_user ON usage_stats(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);
`);

// Helper functions
const helpers = {
    // User functions
    createUser: (username, hPassword, role = 'client', isVerified = 0) => {
        return db.prepare('INSERT INTO users (username, password, role, is_verified) VALUES (?, ?, ?, ?)').run(username, hPassword, role, isVerified);
    },

    getUserByUsername: (username) => {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    getUserById: (id) => {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },

    getAllUsers: () => {
        return db.prepare('SELECT * FROM users').all();
    },

    updateUser: (id, updates) => {
        const fields = [];
        const values = [];

        if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
        if (updates.username !== undefined) { fields.push('username = ?'); values.push(updates.username); }
        if (updates.password !== undefined) { fields.push('password = ?'); values.push(updates.password); }

        if (fields.length === 0) return { changes: 0 };

        values.push(id);
        const setClause = fields.join(', ');

        return db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values);
    },

    // Session functions
    createSession: (deviceId, userId) => {
        return db.prepare('INSERT INTO sessions (device_id, user_id) VALUES (?, ?)').run(deviceId, userId);
    },

    getSession: (deviceId, userId) => {
        if (userId) {
            return db.prepare('SELECT * FROM sessions WHERE device_id = ? AND user_id = ?').get(deviceId, userId);
        }
        return db.prepare('SELECT * FROM sessions WHERE device_id = ?').get(deviceId);
    },

    getAllSessions: (userId) => {
        if (userId) {
            return db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC').all(userId);
        }
        return db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();
    },

    updateSessionState: (deviceId, state) => {
        return db.prepare('UPDATE sessions SET connection_state = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?')
            .run(state, deviceId);
    },

    updateSessionPhone: (deviceId, phoneNumber) => {
        return db.prepare('UPDATE sessions SET phone_number = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?')
            .run(phoneNumber, deviceId);
    },

    // DEPRECATED: Per-device API key (kept for backward compat during migration)
    setApiKey: (deviceId, apiKey) => {
        return db.prepare('UPDATE sessions SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?')
            .run(apiKey, deviceId);
    },

    deleteSession: (deviceId, userId) => {
        if (userId) {
            const session = db.prepare('SELECT id FROM sessions WHERE device_id = ? AND user_id = ?').get(deviceId, userId);
            if (!session) return { changes: 0 };
        }
        // Delete auth state
        db.prepare('DELETE FROM auth_state WHERE device_id = ?').run(deviceId);
        return db.prepare('DELETE FROM sessions WHERE device_id = ?').run(deviceId);
    },

    // DEPRECATED: Per-device API key validation
    validateApiKey: (deviceId, apiKey) => {
        const session = db.prepare('SELECT * FROM sessions WHERE device_id = ? AND api_key = ?')
            .get(deviceId, apiKey);
        return session !== undefined;
    },

    // User-level API key functions
    setUserApiKey: (userId, apiKey) => {
        return db.prepare('UPDATE users SET api_key = ? WHERE id = ?')
            .run(apiKey, userId);
    },

    getUserApiKey: (userId) => {
        const user = db.prepare('SELECT api_key FROM users WHERE id = ?').get(userId);
        return user?.api_key || null;
    },

    validateUserApiKey: (apiKey) => {
        const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
        return user || null;
    },

    // Quota management functions
    getUserQuota: (userId) => {
        return db.prepare(`
            SELECT device_limit, message_quota_daily, message_quota_monthly, 
                   storage_limit_mb, account_expiry, is_quota_unlimited 
            FROM users WHERE id = ?
        `).get(userId);
    },

    updateUserQuota: (userId, quotas) => {
        const fields = [];
        const values = [];

        if (quotas.device_limit !== undefined) { fields.push('device_limit = ?'); values.push(quotas.device_limit); }
        if (quotas.message_quota_daily !== undefined) { fields.push('message_quota_daily = ?'); values.push(quotas.message_quota_daily); }
        if (quotas.message_quota_monthly !== undefined) { fields.push('message_quota_monthly = ?'); values.push(quotas.message_quota_monthly); }
        if (quotas.storage_limit_mb !== undefined) { fields.push('storage_limit_mb = ?'); values.push(quotas.storage_limit_mb); }
        if (quotas.account_expiry !== undefined) { fields.push('account_expiry = ?'); values.push(quotas.account_expiry); }
        if (quotas.is_quota_unlimited !== undefined) { fields.push('is_quota_unlimited = ?'); values.push(quotas.is_quota_unlimited); }

        if (fields.length === 0) return { changes: 0 };

        values.push(userId);
        const setClause = fields.join(', ');

        return db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...values);
    },

    // Usage tracking functions
    getTodayUsage: (userId) => {
        const today = new Date().toISOString().split('T')[0];
        return db.prepare('SELECT * FROM usage_stats WHERE user_id = ? AND date = ?').get(userId, today);
    },

    getMonthUsage: (userId) => {
        const yearMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        return db.prepare(`
            SELECT SUM(messages_sent_daily) as total_messages 
            FROM usage_stats 
            WHERE user_id = ? AND date LIKE ?
        `).get(userId, `${yearMonth}%`);
    },

    incrementMessageCount: (userId) => {
        const today = new Date().toISOString().split('T')[0];

        // Try to update existing record
        const result = db.prepare(`
            UPDATE usage_stats 
            SET messages_sent_daily = messages_sent_daily + 1,
                messages_sent_monthly = messages_sent_monthly + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND date = ?
        `).run(userId, today);

        // If no record exists, create one
        if (result.changes === 0) {
            db.prepare(`
                INSERT INTO usage_stats (user_id, date, messages_sent_daily, messages_sent_monthly)
                VALUES (?, ?, 1, 1)
            `).run(userId, today);
        }

        return result;
    },

    updateStorageUsage: (userId, sizeMB) => {
        const today = new Date().toISOString().split('T')[0];

        // Get or create today's usage record
        let usage = db.prepare('SELECT * FROM usage_stats WHERE user_id = ? AND date = ?').get(userId, today);

        if (!usage) {
            db.prepare(`
                INSERT INTO usage_stats (user_id, date, storage_used_mb)
                VALUES (?, ?, ?)
            `).run(userId, today, sizeMB);
        } else {
            db.prepare(`
                UPDATE usage_stats 
                SET storage_used_mb = storage_used_mb + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND date = ?
            `).run(sizeMB, userId, today);
        }
    },

    getTotalStorageUsed: (userId) => {
        const result = db.prepare(`
            SELECT SUM(storage_used_mb) as total_storage 
            FROM usage_stats 
            WHERE user_id = ?
        `).get(userId);

        return result?.total_storage || 0;
    },

    resetDailyUsage: () => {
        // This should be called by a cron job daily
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        db.prepare('DELETE FROM usage_stats WHERE date < ?').run(yesterday);
    },

    getUserSessionCount: (userId) => {
        const result = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(userId);
        return result.count;
    }
};

module.exports = { db, ...helpers };
