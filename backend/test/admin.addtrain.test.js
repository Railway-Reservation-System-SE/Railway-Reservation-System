const fs = require('fs');
const path = require('path');
const request = require('supertest');

const app = require('../src/index');
const db = require('../src/db');
const { createAdminToken } = require('./helpers/adminAuth');

describe('POST /admin/trains (RRS-F-050)', () => {
  // /admin/* requires a logged-in user (RRS-SR-002). Role checks come with RRS-SR-004.
  let token;
  let adminUserId;
  const adminToken = () => token;
  const createdIds = [];

  // Create the schema so this suite does not depend on another suite running first.
  beforeAll(async () => {
    db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
    const admin = await createAdminToken();
    token = admin.token;
    adminUserId = admin.userId;
  });

  afterAll(() => {
    for (const id of createdIds) {
      db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(id);
      db.prepare('DELETE FROM trains WHERE id = ?').run(id);
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(adminUserId);
  });

  const payload = {
    number: 'T-9001',
    name: 'Test Express',
    source: 'TestSource',
    destination: 'TestDest',
    travelDate: '2030-01-15',
    classes: [
      { class_name: 'SL', fare: 500, totalSeats: 72 },
      { class_name: '3A', fare: 1200, totalSeats: 40 },
    ],
  };

  test('creates a train with classes and returns 201 { id }', async () => {
    const res = await request(app).post('/admin/trains').set('Authorization', `Bearer ${adminToken()}`).send(payload);
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('number');
    createdIds.push(res.body.id);

    const rows = db.prepare('SELECT * FROM train_classes WHERE train_id = ?').all(res.body.id);
    expect(rows).toHaveLength(2);
  });

  test('new train shows up in search for its route/date', async () => {
    const created = await request(app).post('/admin/trains').set('Authorization', `Bearer ${adminToken()}`).send(payload);
    createdIds.push(created.body.id);

    const res = await request(app)
      .get('/trains/search')
      .query({ source: 'TestSource', destination: 'TestDest', date: '2030-01-15' });
    expect(res.status).toBe(200);
    expect(res.body.some((t) => t.id === created.body.id)).toBe(true);
  });

  test('returns 401 without a token (RRS-SR-002)', async () => {
    const res = await request(app).post('/admin/trains').send(payload);
    expect(res.status).toBe(401);
  });

  test('missing fields returns 400', async () => {
    const res = await request(app).post('/admin/trains').set('Authorization', `Bearer ${adminToken()}`).send({ name: 'No Number' });
    expect(res.status).toBe(400);
  });

  test('negative fare returns 400', async () => {
    const bad = { ...payload, classes: [{ class_name: 'SL', fare: -5, totalSeats: 10 }] };
    const res = await request(app).post('/admin/trains').set('Authorization', `Bearer ${adminToken()}`).send(bad);
    expect(res.status).toBe(400);
  });
});