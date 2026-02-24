const { db } = require('./src/db/database');
try {
    db.prepare('DELETE FROM auth_state').run();
    console.log('Cleared auth_state table.');
} catch (e) {
    console.error(e);
}
