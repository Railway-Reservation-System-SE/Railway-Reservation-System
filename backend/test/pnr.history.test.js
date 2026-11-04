process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');
const { createPassengerToken } = require('./helpers/adminAuth');

describe('GET /bookings/me (RRS-F-041)', () => {
  let passengerA;
  let passengerB;
  let trainId;
  let passengerABookings;
  let passengerBBooking;

  const passengers = [{ name: 'Test Passenger', age: 25, gender: 'M' }];

  beforeAll(async () => {
    passengerA = await createPassengerToken();
    passengerB = await createPassengerToken();

    trainId = Number(
      db.prepare(
        `INSERT INTO trains (number, name, source, destination, travel_date)
         VALUES (?, ?, ?, ?, ?)`
      ).run('T-F041', 'History Express', 'Bangalore', 'Chennai', '2031-06-15')
        .lastInsertRowid
    );

    const insertBooking = db.prepare(
      `INSERT INTO bookings
       (pnr, user_id, train_id, class_name, travel_date, passengers_json, fare_paid, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertBooking.run(
      '2345678901',
      passengerA.userId,
      trainId,
      'SL',
      '2031-06-15',
      JSON.stringify(passengers),
      1000,
      'CONFIRMED',
      '2031-01-01 10:00:00'
    );

    insertBooking.run(
      '2345678902',
      passengerA.userId,
      trainId,
      '3A',
      '2031-06-15',
      JSON.stringify(passengers),
      2000,
      'CANCELLED',
      '2031-01-02 10:00:00'
    );

    insertBooking.run(
      '2345678903',
      passengerB.userId,
      trainId,
      '2A',
      '2031-06-15',
      JSON.stringify(passengers),
      3000,
      'CONFIRMED',
      '2031-01-03 10:00:00'
    );

    passengerABookings = [
      {
        id: expect.any(Number),
        pnr: '2345678902',
        status: 'CANCELLED',
        train: {
          number: 'T-F041',
          name: 'History Express',
          source: 'Bangalore',
          destination: 'Chennai',
        },
        classType: '3A',
        travelDate: '2031-06-15',
        farePaid: 2000,
      },
      {
        id: expect.any(Number),
        pnr: '2345678901',
        status: 'CONFIRMED',
        train: {
          number: 'T-F041',
          name: 'History Express',
          source: 'Bangalore',
          destination: 'Chennai',
        },
        classType: 'SL',
        travelDate: '2031-06-15',
        farePaid: 1000,
      },
    ];

    passengerBBooking = {
      id: expect.any(Number),
      pnr: '2345678903',
      status: 'CONFIRMED',
      train: {
        number: 'T-F041',
        name: 'History Express',
        source: 'Bangalore',
        destination: 'Chennai',
      },
      classType: '2A',
      travelDate: '2031-06-15',
      farePaid: 3000,
    };
  });

  afterAll(() => {
    if (trainId) {
      db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
      db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    }

    if (passengerA?.userId) {
      db.prepare('DELETE FROM users WHERE id = ?').run(passengerA.userId);
    }

    if (passengerB?.userId) {
      db.prepare('DELETE FROM users WHERE id = ?').run(passengerB.userId);
    }
  });

  test('returns 401 when no authentication token is supplied', async () => {
    const res = await request(app).get('/bookings/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  test('returns 401 when an invalid token is supplied', async () => {
    const res = await request(app)
      .get('/bookings/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  test('returns only the logged-in passenger bookings in newest-first order', async () => {
    const res = await request(app)
      .get('/bookings/me')
      .set('Authorization', `Bearer ${passengerA.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(passengerABookings);
  });

  test('does not expose another passenger bookings', async () => {
    const res = await request(app)
      .get('/bookings/me')
      .set('Authorization', `Bearer ${passengerB.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([passengerBBooking]);
    expect(res.body).not.toContainEqual(passengerABookings[0]);
    expect(res.body).not.toContainEqual(passengerABookings[1]);
  });

  test('returns an empty array when the passenger has no bookings', async () => {
    const passengerWithoutBookings = await createPassengerToken();

    try {
      const res = await request(app)
        .get('/bookings/me')
        .set('Authorization', `Bearer ${passengerWithoutBookings.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    } finally {
      db.prepare('DELETE FROM users WHERE id = ?').run(
        passengerWithoutBookings.userId
      );
    }
  });
});
