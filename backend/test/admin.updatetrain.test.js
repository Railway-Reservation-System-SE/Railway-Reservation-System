const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');
const { createAdminToken } = require('./helpers/adminAuth');

describe('PUT/DELETE /admin/trains/:id (RRS-F-051)', () => {
  const trainIds = [];
  const userIds = [];
  let token;
  let adminUserId;

  beforeAll(async () => {
    db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
    const admin = await createAdminToken();
    token = admin.token;
    adminUserId = admin.userId;
  });

  const adminRequest = (method, route) =>
    request(app)[method](route).set('Authorization', `Bearer ${token}`);

  const makeTrain = async (suffix) => {
    const res = await adminRequest('post', '/admin/trains').send({
      number: `T-F051-${suffix}`,
      name: 'Update Test Express',
      source: 'UpdSource',
      destination: 'UpdDest',
      travelDate: '2030-02-20',
      classes: [{ class_name: 'SL', fare: 400, totalSeats: 50 }],
    });
    trainIds.push(res.body.id);
    return res.body.id;
  };

  afterAll(() => {
    for (const id of trainIds) {
      db.prepare('DELETE FROM bookings WHERE train_id = ?').run(id);
      db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(id);
      db.prepare('DELETE FROM trains WHERE id = ?').run(id);
    }
    for (const id of userIds) {
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(adminUserId);
  });

  test('PUT updates only provided fields and upserts classes', async () => {
    const id = await makeTrain('a');
    const res = await adminRequest('put', `/admin/trains/${id}`).send({
      name: 'Renamed Express',
      classes: [
        { class_name: 'SL', fare: 450, totalSeats: 60 },
        { class_name: '2A', fare: 1500, totalSeats: 20 },
      ],
    });
    expect(res.status).toBe(200);

    const train = db.prepare('SELECT * FROM trains WHERE id = ?').get(id);
    expect(train.name).toBe('Renamed Express');
    expect(train.source).toBe('UpdSource');

    const classes = db.prepare('SELECT * FROM train_classes WHERE train_id = ?').all(id);
    expect(classes).toHaveLength(2);
    expect(classes.find((c) => c.class_name === 'SL').fare).toBe(450);
  });

  test('PUT on unknown train returns 404', async () => {
    const res = await adminRequest('put', '/admin/trains/999999').send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  test('PUT with empty name returns 400', async () => {
    const id = await makeTrain('b');
    const res = await adminRequest('put', `/admin/trains/${id}`).send({ name: '  ' });
    expect(res.status).toBe(400);
  });

  test('DELETE removes a train with no bookings', async () => {
    const id = await makeTrain('c');
    const res = await adminRequest('delete', `/admin/trains/${id}`);
    expect(res.status).toBe(200);
    expect(db.prepare('SELECT id FROM trains WHERE id = ?').get(id)).toBeUndefined();
  });

  test('DELETE on unknown train returns 404', async () => {
    const res = await adminRequest('delete', '/admin/trains/999999');
    expect(res.status).toBe(404);
  });

  test('DELETE with a CONFIRMED booking returns 409 and keeps the train', async () => {
    const id = await makeTrain('d');
    const user = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('t', ?, 'x', 'passenger')")
      .run(`f051-${Date.now()}@test.com`);
    userIds.push(Number(user.lastInsertRowid));
    db.prepare(
      "INSERT INTO bookings (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid, status) VALUES (?,?,?,?,?,?,?,'CONFIRMED')"
    ).run(`F051${Date.now()}`, Number(user.lastInsertRowid), id, 'SL', '2030-02-20', '[]', 400);

    const res = await adminRequest('delete', `/admin/trains/${id}`);
    expect(res.status).toBe(409);
    expect(db.prepare('SELECT id FROM trains WHERE id = ?').get(id)).toBeDefined();
  });
});