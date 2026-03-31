const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const db = require("../db/database");

// 🔥 REMOVE CSV COMPLETELY (this was causing your issue)

// ---------------- LOGIN ----------------
router.post("/login", (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    username = String(username).toLowerCase().trim();

    db.get(
      "SELECT * FROM users WHERE username = ?",
      [username],
      async (err, user) => {
        if (err) {
          console.error("DB ERROR:", err);
          return res.status(500).json({ error: err.message });
        }

        // 🔥 FIX 1: user check
        if (!user || !user.password_hash) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        // 🔥 FIX 2: JWT check
        if (!process.env.JWT_SECRET) {
          return res.status(500).json({ error: "JWT_SECRET not defined" });
        }

        const token = jwt.sign(
          { username: user.username, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.json({
          token,
          username: user.username,
          role: user.role,
        });
      }
    );
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- REGISTER ----------------
router.post("/register", (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    username = String(username).toLowerCase().trim();

    db.get(
      "SELECT username FROM users WHERE username = ?",
      [username],
      async (err, existing) => {
        if (err) {
          console.error("DB ERROR:", err);
          return res.status(500).json({ error: err.message });
        }

        if (existing) {
          return res.status(409).json({ error: "User already exists" });
        }

        const hash = await bcrypt.hash(password, 10);

        db.run(
          `INSERT INTO users (username, password_hash, role, created_at)
           VALUES (?, ?, ?, ?)`,
          [username, hash, "user", new Date().toISOString()],
          (err) => {
            if (err) {
              console.error("INSERT ERROR:", err);
              return res.status(500).json({ error: err.message });
            }

            res.json({ message: "Account created successfully" });
          }
        );
      }
    );
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- ME ----------------
const { authMiddleware } = require("../middleware/auth");

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    username: req.user.username,
    role: req.user.role,
  });
});

module.exports = router;