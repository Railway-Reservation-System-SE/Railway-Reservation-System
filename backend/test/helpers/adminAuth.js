process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../src/index');
const db = require('../../src/db');

async function createAdminToken() {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const hash = bcrypt.hashSync('secret123', 4);
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Test Admin', ?, ?, 'admin')")
    .run(email, hash);
  const login = await request(app).post('/auth/login').send({ email, password: 'secret123' });
  if (login.status !== 200 || typeof login.body.token !== 'string') {
    throw new Error(`Failed to create admin test token: login returned ${login.status}`);
  }
  return { token: login.body.token, userId: Number(result.lastInsertRowid) };
}

module.exports = { createAdminToken };
