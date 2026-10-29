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
