process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

describe('GET /bookings/pnr/:pnr (RRS-F-040)', () => {
  let trainId;
  let userId;
  let confirmedPnr;
  let cancelledPnr;

  const passengers = [
    { name: 'Passenger One', age: 25, gender: 'M' },
    { name: 'Passenger Two', age: 22, gender: 'F' },
  ];

  beforeAll(() => {
    userId = Number(
      db.prepare(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
      ).run('PNR Status Tester', `pnr-status-${Date.now()}@test.com`, 'test-hash')
        .lastInsertRowid
    );

    trainId = Number(
      db.prepare(
        `INSERT INTO trains (number, name, source, destination, travel_date)
         VALUES (?, ?, ?, ?, ?)`
      ).run('T-F040', 'Status Express', 'Bangalore', 'Chennai', '2031-05-10')
        .lastInsertRowid
    );

    const insertBooking = db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    confirmedPnr = '1234567890';
    cancelledPnr = '1234567891';

    insertBooking.run(
      confirmedPnr,
      userId,
      trainId,
      'SL',
      '2031-05-10',
      JSON.stringify(passengers),
      1000,
      'CONFIRMED'
    );

    insertBooking.run(
      cancelledPnr,
      userId,
      trainId,
      '3A',
      '2031-05-10',
      JSON.stringify(passengers),
      2000,
      'CANCELLED'
    );
  });

  afterAll(() => {
    db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  test('returns complete details for a confirmed booking without authentication', async () => {
    const res = await request(app).get(`/bookings/pnr/${confirmedPnr}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      pnr: confirmedPnr,
      status: 'CONFIRMED',
      train: {
        number: 'T-F040',
        name: 'Status Express',
        source: 'Bangalore',
        destination: 'Chennai',
      },
      classType: 'SL',
      travelDate: '2031-05-10',
      passengers,
      farePaid: 1000,
    });
  });

  test('returns booking details when the booking is cancelled', async () => {
    const res = await request(app).get(`/bookings/pnr/${cancelledPnr}`);

    expect(res.status).toBe(200);
    expect(res.body.pnr).toBe(cancelledPnr);
    expect(res.body.status).toBe('CANCELLED');
  });

  test('returns 404 for an unknown PNR', async () => {
    const res = await request(app).get('/bookings/pnr/9999999999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'Booking not found for this PNR',
    });
  });

  test('returns 400 for an invalid PNR format', async () => {
    const res = await request(app).get('/bookings/pnr/12345');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'Invalid PNR number',
    });
  });
});
