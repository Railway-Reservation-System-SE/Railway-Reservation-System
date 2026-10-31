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
  test('DELETE removes a train whose only bookings are CANCELLED', async () => {
    const id = await makeTrain('e');
    const user = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('t', ?, 'x', 'passenger')")
      .run(`f051c-${Date.now()}@test.com`);
    userIds.push(Number(user.lastInsertRowid));
    db.prepare(
      "INSERT INTO bookings (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid, status) VALUES (?,?,?,?,?,?,?,'CANCELLED')"
    ).run(`F051C${Date.now()}`, Number(user.lastInsertRowid), id, 'SL', '2030-02-20', '[]', 400);

    const res = await request(app).delete(`/admin/trains/${id}`).set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(200);
    expect(db.prepare('SELECT id FROM trains WHERE id = ?').get(id)).toBeUndefined();
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE train_id = ?').get(id).n).toBe(0);
  });

  test('POST rejects an unsupported class_name with 400 and creates nothing', async () => {
    const res = await request(app)
      .post('/admin/trains')
      .set('Authorization', 'Bearer ' + token)
      .send({
        number: 'T-F051-EC',
        name: 'EC Express',
        source: 'EcSrc',
        destination: 'EcDst',
        travelDate: '2030-02-21',
        classes: [{ class_name: 'EC', fare: 500, totalSeats: 10 }],
      });
    expect(res.status).toBe(400);
    expect(db.prepare("SELECT COUNT(*) AS n FROM trains WHERE number = 'T-F051-EC'").get().n).toBe(0);
  });

  test('PUT rejects an unsupported class_name with 400 and changes nothing', async () => {
    const id = await makeTrain('f');
    const res = await request(app)
      .put(`/admin/trains/${id}`)
      .set('Authorization', 'Bearer ' + token)
      .send({ classes: [{ class_name: 'EC', fare: 500, totalSeats: 10 }] });
    expect(res.status).toBe(400);
    expect(db.prepare('SELECT COUNT(*) AS n FROM train_classes WHERE train_id = ?').get(id).n).toBe(1);
  });

  test('PUT cannot lower totalSeats below booked seats, and rolls back the whole update', async () => {
    const id = await makeTrain('g');
    db.prepare("UPDATE train_classes SET booked_seats = 10 WHERE train_id = ? AND class_name = 'SL'").run(id);

    const blocked = await request(app)
      .put(`/admin/trains/${id}`)
      .set('Authorization', 'Bearer ' + token)
      .send({ name: 'Should Not Stick', classes: [{ class_name: 'SL', fare: 400, totalSeats: 5 }] });
    expect(blocked.status).toBe(400);
    expect(db.prepare('SELECT name FROM trains WHERE id = ?').get(id).name).toBe('Update Test Express');
    expect(db.prepare("SELECT total_seats FROM train_classes WHERE train_id = ? AND class_name = 'SL'").get(id).total_seats).toBe(50);

    const allowed = await request(app)
      .put(`/admin/trains/${id}`)
      .set('Authorization', 'Bearer ' + token)
      .send({ classes: [{ class_name: 'SL', fare: 400, totalSeats: 10 }] });
    expect(allowed.status).toBe(200);
    expect(db.prepare("SELECT total_seats FROM train_classes WHERE train_id = ? AND class_name = 'SL'").get(id).total_seats).toBe(10);
  });});