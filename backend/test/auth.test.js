const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const auth = require('../src/middleware/auth');

// Small app with one protected route that echoes req.user.
const app = express();
app.get('/protected', auth, (req, res) => res.status(200).json({ user: req.user }));

const sign = (payload, options) => jwt.sign(payload, process.env.JWT_SECRET, options);

describe('JWT auth middleware (RRS-SR-002)', () => {
  it('returns 401 when no Authorization header is sent', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 when the header is not a Bearer token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('returns 401 for a token signed with a different secret', async () => {
    const bad = jwt.sign({ userId: 1, role: 'passenger' }, 'other-secret');
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an expired token', async () => {
    const expired = sign({ userId: 1, role: 'passenger' }, { expiresIn: -10 });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('passes a valid token through and sets req.user', async () => {
    const token = sign({ userId: 7, role: 'admin' }, { expiresIn: '1h' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: 7, role: 'admin' } });
  });

  it('returns 500 instead of verifying when JWT_SECRET is unset', async () => {
    const token = sign({ userId: 1, role: 'passenger' });
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(500);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});

describe('JWT claims validation', () => {
  it.each([{}, { userId: 1 }, { role: 'passenger' }, { userId: 0, role: 'admin' }, { userId: -1, role: 'passenger' }, { userId: '1', role: 'passenger' }, { userId: 1, role: 'superadmin' }])('rejects a signed token with invalid identity claims', async (claims) => {
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${sign(claims)}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });
  it('accepts a valid passenger identity', async () => {
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${sign({ userId: 1, role: 'passenger' })}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: 1, role: 'passenger' } });
  });
});

// RRS-F-004: real endpoint checks with disposable data; reset email is log-only.
describe('password reset endpoints', () => {
  const fs = require('fs');
  const path = require('path');
  const bcrypt = require('bcrypt');
  const apiApp = require('../src/index');
  const db = require('../src/db');
  const email = 'password-reset@example.test';
  let userId;
  let log;
  let errorLog;
  beforeAll(() => {
    db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
  });
  beforeEach(() => {
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
    userId = Number(db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
      .run('Reset Tester', email, bcrypt.hashSync('old-password', 4), 'passenger').lastInsertRowid);
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    log.mockRestore(); errorLog.mockRestore();
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
  });
  const reset = (token, newPassword = 'new-password') => request(apiApp).post('/auth/reset-password').send({ token, newPassword });
  const resetToken = (claims = {}, options = {}) => sign({ userId, purpose: 'reset', ...claims }, { expiresIn: '15m', ...options });

  it('responds identically for known, unknown and malformed email without leaking a token', async () => {
    const known = await request(apiApp).post('/auth/request-password-reset').send({ email });
    const unknown = await request(apiApp).post('/auth/request-password-reset').send({ email: 'nobody@example.test' });
    const malformed = await request(apiApp).post('/auth/request-password-reset').send({ email: {} });
    expect([known.status, unknown.status, malformed.status]).toEqual([200, 200, 200]);
    expect(known.body).toEqual(unknown.body); expect(known.body).toEqual(malformed.body);
    expect(log).toHaveBeenCalledTimes(1);
    const token = log.mock.calls[0][0].split('token=')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe(userId); expect(decoded.purpose).toBe('reset');
    expect(decoded.exp - decoded.iat).toBe(900);
    expect(JSON.stringify(known.body)).not.toContain(token);
  });
  it('changes the password using the actual logged link and immediately logs in with the new one', async () => {
    await request(apiApp).post('/auth/request-password-reset').send({ email });
    const token = log.mock.calls[0][0].split('token=')[1];
    expect((await reset(token)).status).toBe(200);
    const row = db.prepare('SELECT password_hash FROM users WHERE id=?').get(userId);
    expect(bcrypt.compareSync('new-password', row.password_hash)).toBe(true);
    expect(row.password_hash).not.toBe('new-password');
    expect((await request(apiApp).post('/auth/login').send({ email, password: 'new-password' })).status).toBe(200);
    expect((await request(apiApp).post('/auth/login').send({ email, password: 'old-password' })).status).toBe(401);
    expect((await request(apiApp).post('/bookings').set('Authorization', `Bearer ${token}`).send({})).status).toBe(401);
  });
  it.each(['expired', 'tampered', 'session-token', 'unknown-user', 'missing-user'])('rejects %s reset token without changing the password', async (kind) => {
    const before = db.prepare('SELECT password_hash FROM users WHERE id=?').get(userId).password_hash;
    const tokens = {
      expired: resetToken({}, { expiresIn: -1 }),
      tampered: resetToken() + 'x',
      'session-token': sign({ userId, role: 'passenger' }),
      'unknown-user': resetToken({ userId: 999999 }),
      'missing-user': sign({ purpose: 'reset' }),
    };
    expect((await reset(tokens[kind])).status).toBe(400);
    expect(db.prepare('SELECT password_hash FROM users WHERE id=?').get(userId).password_hash).toBe(before);
  });
  it.each(['', '12345', 'x'.repeat(73), 'é'.repeat(37), null, {}])('rejects an invalid new password', async (password) => {
    expect((await reset(resetToken(), password)).status).toBe(400);
  });
  it('handles missing secret without exposing account existence', async () => {
    const token = resetToken(); const saved = process.env.JWT_SECRET; delete process.env.JWT_SECRET;
    try {
      const res = await request(apiApp).post('/auth/request-password-reset').send({ email });
      expect(res.status).toBe(200); expect(log).not.toHaveBeenCalled();
      expect((await reset(token)).status).toBe(500);
    } finally { process.env.JWT_SECRET = saved; }
  });
});
