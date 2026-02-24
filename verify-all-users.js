// One-time script to verify all existing users
const { db } = require('./src/db/database');

console.log('Verifying all existing users...');

// Update all users to be verified
const result = db.prepare('UPDATE users SET is_verified = 1 WHERE is_verified = 0').run();

console.log(`Updated ${result.changes} user(s) to verified status.`);

// Show all users
const users = db.prepare('SELECT id, username, role, is_verified FROM users').all();
console.log('\nCurrent users:');
users.forEach(u => {
    console.log(`- ${u.username} (${u.role}) - Verified: ${u.is_verified === 1 ? 'Yes' : 'No'}`);
});

console.log('\nDone!');
process.exit(0);
