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
    travelDate: '2099-12-31',
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
      .query({ source: 'TestSource', destination: 'TestDest', date: payload.travelDate });
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

  test.each(['2000-01-01', '2099-02-30', 'not-a-date'])('invalid travel date %s returns 400', async (travelDate) => {
    const res = await request(app)
      .post('/admin/trains')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...payload, number: `T-INVALID-${travelDate}`, travelDate });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/travelDate/);
  });

  test('strips HTML from train text fields before saving', async () => {
    const res = await request(app)
      .post('/admin/trains')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        ...payload,
        number: ' <b>T-9001-CLEAN</b> ',
        name: ' <b>Clean Express</b> ',
        source: ' <i>CleanSource</i> ',
        destination: ' <i>CleanDest</i> ',
      });

    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
    const train = db.prepare('SELECT number, name, source, destination FROM trains WHERE id = ?').get(res.body.id);
    expect(train).toEqual({
      number: 'T-9001-CLEAN',
      name: 'Clean Express',
      source: 'CleanSource',
      destination: 'CleanDest',
    });
  });

  test('rejects a required text field that is empty after HTML removal', async () => {
    const res = await request(app)
      .post('/admin/trains')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...payload, name: '<img src=x>' });
    expect(res.status).toBe(400);
  });

  test('rejects a non-numeric fare', async () => {
    const res = await request(app)
      .post('/admin/trains')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...payload, classes: [{ class_name: 'SL', fare: '500', totalSeats: 10 }] });
    expect(res.status).toBe(400);
  });

  test('negative fare returns 400', async () => {
    const bad = { ...payload, classes: [{ class_name: 'SL', fare: -5, totalSeats: 10 }] };
    const res = await request(app).post('/admin/trains').set('Authorization', `Bearer ${adminToken()}`).send(bad);
    expect(res.status).toBe(400);
  });
});