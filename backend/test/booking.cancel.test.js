const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const app = require('../src/index');
const db = require('../src/db');

let userId;
let otherUserId;
let trainId;
let bookingId;
let cancelledBookingId;

const token = (id) =>
  jwt.sign({ userId: id, role: 'passenger' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

const postCancel = (id, user = userId) =>
  request(app)
    .post(`/bookings/${id}/cancel`)
    .set('Authorization', `Bearer ${token(user)}`);

beforeAll(() => {
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));

  userId = Number(
    db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)')
      .run('Cancel Tester', `cancel-${Date.now()}@example.test`, 'x').lastInsertRowid
  );

  otherUserId = Number(
    db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?,?,?)')
      .run('Other Tester', `other-${Date.now()}@example.test`, 'x').lastInsertRowid
  );

  trainId = Number(
    db.prepare(
      'INSERT INTO trains (number, name, source, destination, travel_date) VALUES (?,?,?,?,?)'
    ).run('T-CANCEL-1', 'Cancel Test Express', 'A', 'B', '2031-03-10').lastInsertRowid
  );

  bookingId = Number(
    db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('1111111111', userId, trainId, 'SL', '2031-03-10', '[]', 500).lastInsertRowid
  );

  cancelledBookingId = Number(
    db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CANCELLED')`
    ).run('2222222222', userId, trainId, 'SL', '2031-03-10', '[]', 500).lastInsertRowid
  );
});

afterAll(() => {
  db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
  db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
  db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(userId, otherUserId);
});

describe('POST /bookings/:id/cancel (RRS-F-030)', () => {
  it('returns 401 without authentication', async () => {
    const res = await request(app).post(`/bookings/${bookingId}/cancel`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for a booking that does not exist', async () => {
    const res = await postCancel(999999);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Booking not found' });
  });

  it('returns 403 when the booking belongs to another user', async () => {
    const res = await postCancel(bookingId, otherUserId);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Not your booking' });
  });

  it('cancels the owners confirmed booking', async () => {
    const res = await postCancel(bookingId);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'CANCELLED' });

    const booking = db.prepare('SELECT status FROM bookings WHERE id = ?').get(bookingId);
    expect(booking.status).toBe('CANCELLED');
  });

  it('returns 400 when the booking is already cancelled', async () => {
    const res = await postCancel(cancelledBookingId);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Booking already cancelled' });
  });

  it('returns 400 for an invalid booking ID', async () => {
    const res = await postCancel('abc');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid booking ID' });
  });
});