
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'db', 'railway.db');

const db = new Database(dbPath);

// Enforce foreign-key constraints for this connection.
db.pragma('foreign_keys = ON');

module.exports = db;