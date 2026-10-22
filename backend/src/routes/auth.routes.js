const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();

// RRS-F-001 + RRS-SR-001: user registration with bcrypt-hashed password.
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  const present = (v) => typeof v === 'string' && v.trim() !== '';
  if (!present(name) || !present(email) || !present(password)) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ error: 'email must contain "@"' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,'passenger')")
      .run(name, email, hash);
    return res.status(201).json({ id: Number(result.lastInsertRowid), name, email });
  } catch (err) {
    if (err && String(err.code).startsWith('SQLITE_CONSTRAINT')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
