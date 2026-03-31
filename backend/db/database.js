const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./data.db");

// create users table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      role TEXT,
      created_at TEXT
    )
  `);
});

module.exports = db;