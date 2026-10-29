const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const app = require('../src/index');
const db = require('../src/db');

const TRAIN_NUMBER = 'T-BOOK-1';
const TRAVEL_DATE = '2031-03-10';
let trainId;

const token = () => jwt.sign({ userId: 1, role: 'passenger' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const passenger = { name: 'Asha', age: 30, gender: 'F' };
const validBody = () => ({ trainId, classType: 'SL', travelDate: TRAVEL_DATE, passengers: [passenger] });
const post = (body) => request(app).post('/bookings').set('Authorization', `Bearer ${token()}`).send(body);

beforeAll(() => {
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
  trainId = Number(
    db
      .prepare('INSERT INTO trains (number, name, source, destination, travel_date) VALUES (?,?,?,?,?)')
      .run(TRAIN_NUMBER, 'Booking Test Express', 'A', 'B', TRAVEL_DATE).lastInsertRowid
  );
  db.prepare('INSERT INTO train_classes (train_id, class_name, fare, total_seats) VALUES (?,?,?,?)').run(
    trainId,
    'SL',
    500,
    72
  );
});

afterAll(() => {
  db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
  db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
});

describe('POST /bookings (RRS-F-020)', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/bookings').send(validBody());
    expect(res.status).toBe(401);
  });

  it('returns 400 for zero passengers', async () => {
    const res = await post({ ...validBody(), passengers: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for five passengers', async () => {
    const res = await post({ ...validBody(), passengers: Array(5).fill(passenger) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when a passenger field is missing', async () => {
    for (const field of ['name', 'age', 'gender']) {
      const bad = { ...passenger };
      delete bad[field];
      const res = await post({ ...validBody(), passengers: [bad] });
      expect(res.status).toBe(400);
    }
  });

  it('returns 400 when trainId, classType or travelDate is missing', async () => {
    for (const field of ['trainId', 'classType', 'travelDate']) {
      const bad = validBody();
      delete bad[field];
      const res = await post(bad);
      expect(res.status).toBe(400);
    }
  });

  it('returns 404 for an unknown train', async () => {
    const res = await post({ ...validBody(), trainId: 999999 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Train/class not found' });
  });

  it('returns 404 for an unknown class on a real train', async () => {
    const res = await post({ ...validBody(), classType: '2A' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for a wrong travel date', async () => {
    const res = await post({ ...validBody(), travelDate: '2031-03-11' });
    expect(res.status).toBe(404);
  });

  it('passes validation for 1 to 4 passengers but does not book yet (501)', async () => {
    const one = await post(validBody());
    expect(one.status).toBe(501);
    expect(one.body).toEqual({ error: 'Booking not implemented yet' });
    const four = await post({ ...validBody(), passengers: Array(4).fill(passenger) });
    expect(four.status).toBe(501);
    // Nothing is written yet.
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE train_id = ?').get(trainId).n).toBe(0);
    expect(db.prepare('SELECT booked_seats FROM train_classes WHERE train_id = ?').get(trainId).booked_seats).toBe(0);
  });
});

describe('booking request type boundaries', () => {
  it.each([0, -1, '0', '-1'])('rejects a non-positive trainId (%s)', async (trainId) => {
    const res = await post({ ...validBody(), trainId });
    expect(res.status).toBe(400);
  });

  it.each([[1], { id: 1 }, true, false, null, ' ', '1.5'])('rejects a non-integer/scalar trainId shape', async (trainId) => {
    const res = await post({ ...validBody(), trainId });
    expect(res.status).toBe(400);
  });

  it.each([{}, [], true, '30', null])('rejects a non-numeric passenger age', async (age) => {
    const res = await post({ ...validBody(), passengers: [{ ...passenger, age }] });
    expect(res.status).toBe(400);
  });

  it('accepts a numeric-string trainId and does not invent an infant-age restriction', async () => {
    const res = await post({ ...validBody(), trainId: String(trainId), passengers: [{ ...passenger, age: 0 }] });
    expect(res.status).toBe(501);
  });

  it.each([null, 'passengers', {}, [null]])('rejects a malformed passenger collection', async (passengers) => {
    const res = await post({ ...validBody(), passengers });
    expect(res.status).toBe(400);
  });
});
