const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
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

  // bcrypt only uses the first 72 UTF-8 bytes. Never silently truncate a password.
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'password must be at most 72 UTF-8 bytes' });
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

// RRS-F-002: login with email + password, returns a 2h JWT.
router.post('/login', async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = db
    .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
    .get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '2h',
  });
  return res.status(200).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

// RRS-F-004: local classroom simulation, not real email delivery.
router.post('/request-password-reset', (req, res) => {
  const response = { message: 'If the account exists, a reset link has been generated' };
  const { email } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) return res.status(200).json(response);
  if (!process.env.JWT_SECRET) {
    console.error('Password reset unavailable: JWT_SECRET is not configured');
    return res.status(200).json(response);
  }
  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (user) {
      const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });
      // Intentional local-only simulation required by the execution plan.
      // Never expose this log in a public deployment or return the token in JSON.
      console.log(`Password reset (simulated email): http://localhost:5173/reset-password?token=${resetToken}`);
    }
  } catch {
    console.error('Password reset request failed');
  }
  return res.status(200).json(response);
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== 'string' || !token || typeof newPassword !== 'string' ||
      !newPassword.trim() || newPassword.length < 6 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ error: 'A reset token and password of at least 6 characters, at most 72 UTF-8 bytes, are required' });
  }
  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'Server misconfigured' });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload || payload.purpose !== 'reset' || !Number.isSafeInteger(payload.userId) || payload.userId <= 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const result = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, payload.userId);
    if (result.changes !== 1) return res.status(400).json({ error: 'Invalid or expired reset token' });
    return res.status(200).json({ message: 'Password updated' });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
