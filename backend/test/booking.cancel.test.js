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
let slClassId;
let threeAClassId;
let seatReleaseBookingId;
let rollbackBookingId;

const passengers = [
  { name: 'Passenger One', age: 25, gender: 'M' },
  { name: 'Passenger Two', age: 30, gender: 'F' },
];

const token = (id) =>
  jwt.sign({ userId: id, role: 'passenger' }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

const postCancel = (id, user = userId) =>
  request(app)
    .post(`/bookings/${id}/cancel`)
    .set('Authorization', `Bearer ${token(user)}`);

const getBookedSeats = (classId) =>
  db.prepare('SELECT booked_seats FROM train_classes WHERE id = ?').get(classId)
    .booked_seats;

const getBookingStatus = (id) =>
  db.prepare('SELECT status FROM bookings WHERE id = ?').get(id).status;

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

  // The SL class starts with 8 booked seats for fixture setup.
  slClassId = Number(
    db.prepare(
      `INSERT INTO train_classes
       (train_id, class_name, fare, total_seats, booked_seats)
       VALUES (?, 'SL', 500, 10, 8)`
    ).run(trainId).lastInsertRowid
  );

  threeAClassId = Number(
    db.prepare(
      `INSERT INTO train_classes
       (train_id, class_name, fare, total_seats, booked_seats)
       VALUES (?, '3A', 1000, 10, 4)`
    ).run(trainId).lastInsertRowid
  );

  // F-030 booking.
  bookingId = Number(
    db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      '1111111111',
      userId,
      trainId,
      'SL',
      '2031-03-10',
      JSON.stringify(passengers),
      1000
    ).lastInsertRowid
  );

  // Already-cancelled booking.
  cancelledBookingId = Number(
    db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CANCELLED')`
    ).run(
      '2222222222',
      userId,
      trainId,
      'SL',
      '2031-03-10',
      JSON.stringify(passengers),
      1000
    ).lastInsertRowid
  );

  // F-031 successful seat-release booking.
  seatReleaseBookingId = Number(
    db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      '3333333333',
      userId,
      trainId,
      'SL',
      '2031-03-10',
      JSON.stringify(passengers),
      1000
    ).lastInsertRowid
  );

  // F-031 transaction rollback booking.
  rollbackBookingId = Number(
    db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      '4444444444',
      userId,
      trainId,
      'SL',
      '2031-03-10',
      JSON.stringify(passengers),
      1000
    ).lastInsertRowid
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
    expect(getBookingStatus(bookingId)).toBe('CANCELLED');
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

describe('POST /bookings/:id/cancel (RRS-F-031)', () => {
  it('releases exactly the number of seats occupied by passengers', async () => {
    expect(getBookedSeats(slClassId)).toBe(6);

    const res = await postCancel(seatReleaseBookingId);

    expect(res.status).toBe(200);
    expect(getBookedSeats(slClassId)).toBe(4);
    expect(getBookingStatus(seatReleaseBookingId)).toBe('CANCELLED');
  });

  it('does not release seats from another train class', () => {
    expect(getBookedSeats(threeAClassId)).toBe(4);
  });

  it('does not release seats again for an already cancelled booking', async () => {
    const before = getBookedSeats(slClassId);

    const res = await postCancel(seatReleaseBookingId);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Booking already cancelled' });
    expect(getBookedSeats(slClassId)).toBe(before);
  });

  it('rolls back cancellation if there are insufficient booked seats to release', async () => {
    db.prepare('UPDATE train_classes SET booked_seats = 0 WHERE id = ?').run(slClassId);

    const res = await postCancel(rollbackBookingId);

    expect(res.status).toBe(400);
    expect(getBookedSeats(slClassId)).toBe(0);
    expect(getBookingStatus(rollbackBookingId)).toBe('CONFIRMED');
  });
});
