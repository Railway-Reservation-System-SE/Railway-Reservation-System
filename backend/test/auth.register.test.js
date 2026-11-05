const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

const EMAIL = 'register.test@example.com';

beforeAll(() => {
  // CI has no seeded database, so make sure the schema exists.
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
});

beforeEach(() => {
  db.prepare('DELETE FROM users WHERE email = ?').run(EMAIL);
});

afterAll(() => {
  db.prepare('DELETE FROM users WHERE email = ?').run(EMAIL);
});

describe('POST /auth/register', () => {
  const valid = { name: 'Test User', email: EMAIL, password: 'secret123' };

  it('creates a passenger and returns 201 with id, name, email only', async () => {
    const res = await request(app).post('/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(['email', 'id', 'name']);
    expect(res.body.email).toBe(EMAIL);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('stores a bcrypt hash, never the plaintext password', async () => {
    await request(app).post('/auth/register').send(valid);
    const row = db.prepare('SELECT password_hash, role FROM users WHERE email = ?').get(EMAIL);
    expect(row.password_hash.startsWith('$2')).toBe(true);
    expect(row.password_hash).not.toBe(valid.password);
    expect(row.role).toBe('passenger');
  });

  it('returns 409 when the email is already registered', async () => {
    await request(app).post('/auth/register').send(valid);
    const res = await request(app).post('/auth/register').send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  it.each(['name', 'email', 'password'])('returns 400 when %s is missing', async (field) => {
    const body = { ...valid };
    delete body[field];
    const res = await request(app).post('/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for an empty field, an email without "@", or a short password', async () => {
    const bad = [
      { ...valid, name: '   ' },
      { ...valid, email: 'not-an-email' },
      { ...valid, password: '12345' },
    ];
    for (const body of bad) {
      const res = await request(app).post('/auth/register').send(body);
      expect(res.status).toBe(400);
    }
  });
});

// Password length is measured in UTF-8 bytes, not JavaScript characters.
describe('bcrypt password boundary', () => {
  it.each(['x'.repeat(73), 'é'.repeat(37)])('rejects an over-72-byte password', async (password) => {
    const res = await request(app).post('/auth/register').send({ name: 'Boundary', email: EMAIL, password });
    expect(res.status).toBe(400);
    expect(db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL)).toBeUndefined();
  });

  it('accepts exactly 72 bytes and stores a usable hash', async () => {
    const password = 'é'.repeat(36);
    const res = await request(app).post('/auth/register').send({ name: 'Boundary', email: EMAIL, password });
    expect(res.status).toBe(201);
    const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get(EMAIL);
    expect(require('bcrypt').compareSync(password, row.password_hash)).toBe(true);
  });

  it('handles concurrent duplicate registration with one account and one 409', async () => {
    const body = { name: 'Concurrent', email: EMAIL, password: 'secret123' };
    const responses = await Promise.all([request(app).post('/auth/register').send(body), request(app).post('/auth/register').send(body)]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(db.prepare('SELECT COUNT(*) AS n FROM users WHERE email = ?').get(EMAIL).n).toBe(1);
  });
});
