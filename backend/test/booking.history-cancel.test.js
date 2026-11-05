const fs = require('fs');
const path = require('path');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const app = require('../src/index');
const db = require('../src/db');
const { createPassengerToken } = require('./helpers/adminAuth');

// Regression test for the My Bookings cancel flow (UI-CANCEL-PNR, #35):
// the frontend cancels a booking using the numeric id returned by
// GET /bookings/me, so this exercises that id end to end instead of
// only asserting its type.
describe('GET /bookings/me id used to cancel (RRS-F-030/F-041)', () => {
  let passenger;
  let trainId;
  let slClassId;

  const pnr = '6767676767';
  const passengers = [
    { name: 'History Cancel One', age: 28, gender: 'M' },
    { name: 'History Cancel Two', age: 26, gender: 'F' },
  ];

  const getBookedSeats = () =>
    db.prepare('SELECT booked_seats FROM train_classes WHERE id = ?').get(slClassId)
      .booked_seats;

  beforeAll(async () => {
    db.exec(
      fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8')
    );

    passenger = await createPassengerToken();

    trainId = Number(
      db.prepare(
        `INSERT INTO trains (number, name, source, destination, travel_date)
         VALUES (?, ?, ?, ?, ?)`
      ).run('T-HC-1', 'History Cancel Express', 'A', 'B', '2031-07-20')
        .lastInsertRowid
    );

    slClassId = Number(
      db.prepare(
        `INSERT INTO train_classes
         (train_id, class_name, fare, total_seats, booked_seats)
         VALUES (?, 'SL', 500, 10, 4)`
      ).run(trainId).lastInsertRowid
    );

    db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      pnr,
      passenger.userId,
      trainId,
      'SL',
      '2031-07-20',
      JSON.stringify(passengers),
      1000
    );
  });

  afterAll(() => {
    if (trainId) {
      db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
      db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
      db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    }

    if (passenger?.userId) {
      db.prepare('DELETE FROM users WHERE id = ?').run(passenger.userId);
    }
  });

  it('cancels a booking using the id returned by GET /bookings/me', async () => {
    const listBefore = await request(app)
      .get('/bookings/me')
      .set('Authorization', `Bearer ${passenger.token}`);

    expect(listBefore.status).toBe(200);
    const entry = listBefore.body.find((b) => b.pnr === pnr);
    expect(entry).toBeDefined();
    expect(entry.status).toBe('CONFIRMED');
    expect(typeof entry.id).toBe('number');

    const cancel = await request(app)
      .post(`/bookings/${entry.id}/cancel`)
      .set('Authorization', `Bearer ${passenger.token}`);

    expect(cancel.status).toBe(200);
    expect(cancel.body).toEqual({
      status: 'CANCELLED',
      message: 'Booking cancelled, seats released',
    });
    expect(getBookedSeats()).toBe(2);

    const listAfter = await request(app)
      .get('/bookings/me')
      .set('Authorization', `Bearer ${passenger.token}`);

    expect(listAfter.status).toBe(200);
    const cancelled = listAfter.body.find((b) => b.id === entry.id);
    expect(cancelled).toBeDefined();
    expect(cancelled.status).toBe('CANCELLED');
  });
});
