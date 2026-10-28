const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const app = require('../src/index');
const db = require('../src/db');

const EMAIL = 'login.test@example.com';
const PASSWORD = 'secret123';
let userId;

beforeAll(() => {
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
  db.prepare('DELETE FROM users WHERE email = ?').run(EMAIL);
  const hash = bcrypt.hashSync(PASSWORD, 4);
  userId = Number(
    db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,'passenger')")
      .run('Login Tester', EMAIL, hash).lastInsertRowid
  );
});

afterAll(() => {
  db.prepare('DELETE FROM users WHERE email = ?').run(EMAIL);
});

describe('POST /auth/login', () => {
  it('returns 200, a verifiable token and the user without password_hash', async () => {
    const res = await request(app).post('/auth/login').send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: userId, name: 'Login Tester', email: EMAIL, role: 'passenger' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe(userId);
    expect(decoded.role).toBe('passenger');
    expect(decoded.exp - decoded.iat).toBe(2 * 60 * 60);
  });

  it('returns 401 for a wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ email: EMAIL, password: 'wrong-pass' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns the same 401 for an unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('returns 500 instead of signing when JWT_SECRET is not configured', async () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const res = await request(app).post('/auth/login').send({ email: EMAIL, password: PASSWORD });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Server misconfigured' });
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});

describe('login input boundaries', () => {
  it.each([{}, { email: EMAIL }, { email: EMAIL, password: null }, { email: [EMAIL], password: PASSWORD }, { email: EMAIL, password: {} }])('returns generic 401 for malformed input', async (body) => {
    const res = await request(app).post('/auth/login').send(body);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('rejects an overlong password even if bcrypt would match its first 72 bytes', async () => {
    const email = 'long-login@example.test';
    const prefix = 'x'.repeat(72);
    db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run('Legacy Long', email, bcrypt.hashSync(prefix + 'A', 4), 'passenger');
    try {
      const res = await request(app).post('/auth/login').send({ email, password: prefix + 'B' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid credentials' });
    } finally {
      db.prepare('DELETE FROM users WHERE email = ?').run(email);
    }
  });
});
