const bcrypt = require("bcryptjs");
const db = require("./db/database");

(async () => {
  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user123", 10);

  db.run(
    `INSERT OR IGNORE INTO users (username, password_hash, role, created_at)
     VALUES (?, ?, ?, ?)`,
    ["admin", adminHash, "admin", new Date().toISOString()]
  );

  db.run(
    `INSERT OR IGNORE INTO users (username, password_hash, role, created_at)
     VALUES (?, ?, ?, ?)`,
    ["user", userHash, "user", new Date().toISOString()]
  );

  console.log("✅ Users inserted into SQLite successfully");
})();