const { db } = require('./database');
const { BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');

/**
 * SQLite-based auth state for Baileys (per device)
 * @param {string} deviceId - Unique device identifier
 */
const useSQLiteAuthState = async (deviceId) => {
    const writeData = (key, data) => {
        const value = JSON.stringify(data, BufferJSON.replacer);
        db.prepare('INSERT OR REPLACE INTO auth_state (device_id, key_name, key_value) VALUES (?, ?, ?)')
            .run(deviceId, key, value);
    };

    const readData = (key) => {
        const row = db.prepare('SELECT key_value FROM auth_state WHERE device_id = ? AND key_name = ?')
            .get(deviceId, key);
        if (!row) return null;
        return JSON.parse(row.key_value, BufferJSON.reviver);
    };

    const removeData = (key) => {
        db.prepare('DELETE FROM auth_state WHERE device_id = ? AND key_name = ?')
            .run(deviceId, key);
    };

    const creds = readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = readData(`${type}-${id}`);
                        if (value) {
                            data[id] = value;
                        }
                    }
                    return data;
                },
                set: (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                writeData(key, value);
                            } else {
                                removeData(key);
                            }
                        }
                    }
                }
            }
        },
        saveCreds: () => {
            writeData('creds', creds);
        }
    };
};

module.exports = { useSQLiteAuthState };
