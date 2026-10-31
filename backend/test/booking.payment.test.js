process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');
const { simulatePayment } = require('../src/utils/payment');

describe('simulatePayment helper (RRS-F-022)', () => {
  test('total fare is class fare x passenger count', () => {
    expect(simulatePayment('card', 450, 3)).toEqual({ ok: true, totalFare: 1350 });
    expect(simulatePayment('upi', 300, 1)).toEqual({ ok: true, totalFare: 300 });
  });

  test('unrecognised or missing payment method fails', () => {
    expect(simulatePayment('cheque', 300, 1).ok).toBe(false);
    expect(simulatePayment(undefined, 300, 1).ok).toBe(false);
  });
});

describe('POST /bookings payment step (RRS-F-022)', () => {
  const email = `f022-${Date.now()}@test.com`;
  let token;
  let userId;
  let trainId;

  const book = (paymentMethod) =>
    request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        trainId,
        classType: 'SL',
        travelDate: '2030-05-01',
        passengers: [{ name: 'Pay Tester', age: 30, gender: 'F' }],
        paymentMethod,
      });

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ name: 'Pay Tester', email, password: 'secret123' });
    const login = await request(app).post('/auth/login').send({ email, password: 'secret123' });
    token = login.body.token;
    userId = login.body.user.id;

    const train = db
      .prepare("INSERT INTO trains (number, name, source, destination, travel_date) VALUES ('T-F022','Payment Express','PaySrc','PayDst','2030-05-01')")
      .run();
    trainId = Number(train.lastInsertRowid);
    db.prepare("INSERT INTO train_classes (train_id, class_name, fare, total_seats, booked_seats) VALUES (?, 'SL', 300, 10, 0)").run(trainId);
  });

  afterAll(() => {
    db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  test('unrecognised paymentMethod returns 400', async () => {
    const res = await book('bitcoin');
    expect(res.status).toBe(400);
  });

  test('missing paymentMethod returns 400', async () => {
    const res = await book(undefined);
    expect(res.status).toBe(400);
  });

  test('valid paymentMethod passes the payment step', async () => {
    for (const method of ['card', 'upi']) {
      const res = await book(method);
      expect(res.status).not.toBe(400);
      expect(res.status).not.toBe(409);
    }
  });
});