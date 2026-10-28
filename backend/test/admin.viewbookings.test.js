const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

describe('GET /admin/trains/:id/bookings (RRS-F-052)', () => {
  let trainId;
  let userId;

  beforeAll(async () => {
    const res = await request(app).post('/admin/trains').send({
      number: 'T-F052',
      name: 'Bookings Test Express',
      source: 'BkSource',
      destination: 'BkDest',
      travelDate: '2030-03-10',
      classes: [{ class_name: 'SL', fare: 300, totalSeats: 30 }],
    });
    trainId = res.body.id;

    const user = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('t', ?, 'x', 'passenger')")
      .run(`f052-${Date.now()}@test.com`);
    userId = Number(user.lastInsertRowid);

    const insert = db.prepare(
      'INSERT INTO bookings (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid, status) VALUES (?,?,?,?,?,?,?,?)'
    );
    const people = JSON.stringify([{ name: 'Asha', age: 30, gender: 'F' }]);
    insert.run(`F052A${Date.now()}`, userId, trainId, 'SL', '2030-03-10', people, 300, 'CONFIRMED');
    insert.run(`F052B${Date.now()}`, userId, trainId, 'SL', '2030-03-10', people, 300, 'CANCELLED');
  });

  afterAll(() => {
    db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  test('returns both CONFIRMED and CANCELLED bookings with status', async () => {
    const res = await request(app).get(`/admin/trains/${trainId}/bookings`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((b) => b.status).sort()).toEqual(['CANCELLED', 'CONFIRMED']);
    expect(res.body[0].passengerNames).toEqual(['Asha']);
    expect(res.body[0].classType).toBe('SL');
  });

  test('train with no bookings returns an empty list', async () => {
    const created = await request(app).post('/admin/trains').send({
      number: 'T-F052-EMPTY',
      name: 'Empty Express',
      source: 'EmptySource',
      destination: 'EmptyDest',
      travelDate: '2030-03-11',
      classes: [{ class_name: 'SL', fare: 100, totalSeats: 10 }],
    });
    const res = await request(app).get(`/admin/trains/${created.body.id}/bookings`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(created.body.id);
    db.prepare('DELETE FROM trains WHERE id = ?').run(created.body.id);
  });

  test('unknown train returns 404', async () => {
    const res = await request(app).get('/admin/trains/999999/bookings');
    expect(res.status).toBe(404);
  });
});