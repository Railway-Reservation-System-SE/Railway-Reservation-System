process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

describe('POST /bookings seat check (RRS-F-021)', () => {
  const email = `f021-${Date.now()}@test.com`;
  let token;
  let userId
  let trainId;

  const payload = (count) => ({
    trainId,
    classType: 'SL',
    travelDate: '2030-04-01',
    passengers: Array.from({ length: count }, (_, i) => ({ name: `Passenger ${i}`, age: 30, gender: 'M' })),
    paymentMethod: 'card',
  });
  const book = (count) =>
    request(app).post('/bookings').set('Authorization', `Bearer ${token}`).send(payload(count));

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ name: 'Seat Tester', email, password: 'secret123' });
    const login = await request(app).post('/auth/login').send({ email, password: 'secret123' });
    token = login.body.token;
    userId = login.body.user.id;

    const train = db
      .prepare("INSERT INTO trains (number, name, source, destination, travel_date) VALUES ('T-F021','Seat Check Express','SeatSrc','SeatDst','2030-04-01')")
      .run();
    trainId = Number(train.lastInsertRowid);
    // 5 seats total, 3 already booked -> 2 available
    db.prepare("INSERT INTO train_classes (train_id, class_name, fare, total_seats, booked_seats) VALUES (?, 'SL', 300, 5, 3)").run(trainId);
  });

  afterAll(() => {
    db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  test('more passengers than available seats returns 409', async () => {
    const res = await book(3);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Not enough seats available');
  });

  test('a 409 writes nothing: no booking row and booked_seats unchanged', async () => {
    await book(3);
    const count = db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE train_id = ?').get(trainId).n;
    const row = db.prepare("SELECT booked_seats FROM train_classes WHERE train_id = ? AND class_name = 'SL'").get(trainId);
    expect(count).toBe(0);
    expect(row.booked_seats).toBe(3);
  });

  test('exactly the remaining seats is not rejected for seats', async () => {
  const res = await book(2);
  console.log('EXACT SEATS RESPONSE:', res.status, res.body);
  expect(res.status).not.toBe(409);
  expect(res.status).not.toBe(400);
});
});