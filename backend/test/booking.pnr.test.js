process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

// RRS-F-023: the finished POST /bookings route confirms the booking.
// The mid-transaction sold-out path (409 'Seat no longer available') is covered
// at helper level in pnr.confirm.test.js; at route level the F-021 seat check
// rejects an over-capacity request first.
describe('POST /bookings confirmation (RRS-F-023)', () => {
  const email = `f023-${Date.now()}@test.com`;
  let token;
  let userId;
  let trainId;
  let classId;

  const book = (passengers) =>
    request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        trainId,
        classType: 'SL',
        travelDate: '2030-06-01',
        passengers,
        paymentMethod: 'card',
      });

  const pax = (n) => Array.from({ length: n }, (_, i) => ({ name: `P${i}`, age: 30, gender: 'F' }));

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ name: 'PNR Tester', email, password: 'secret123' });
    const login = await request(app).post('/auth/login').send({ email, password: 'secret123' });
    token = login.body.token;
    userId = login.body.user.id;

    const train = db
      .prepare("INSERT INTO trains (number, name, source, destination, travel_date) VALUES ('T-F023','PNR Express','PnrSrc','PnrDst','2030-06-01')")
      .run();
    trainId = Number(train.lastInsertRowid);
    classId = Number(
      db.prepare("INSERT INTO train_classes (train_id, class_name, fare, total_seats, booked_seats) VALUES (?, 'SL', 300, 2, 0)").run(trainId).lastInsertRowid
    );
  });

  afterAll(() => {
    db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  test('a successful booking returns 201 with a PNR and writes a CONFIRMED row', async () => {
    const res = await book(pax(2));
    expect(res.status).toBe(201);
    expect(res.body.pnr).toMatch(/^\d{10}$/);
    expect(res.body.status).toBe('CONFIRMED');
    expect(res.body.farePaid).toBe(600);

    const row = db.prepare('SELECT user_id, status, fare_paid, passengers_json FROM bookings WHERE pnr = ?').get(res.body.pnr);
    expect(row.user_id).toBe(userId);
    expect(row.status).toBe('CONFIRMED');
    expect(row.fare_paid).toBe(600);
    expect(JSON.parse(row.passengers_json)).toHaveLength(2);
  });

  test('booked_seats increases by exactly the passenger count', () => {
    expect(db.prepare('SELECT booked_seats FROM train_classes WHERE id = ?').get(classId).booked_seats).toBe(2);
  });

  test('once full, the seat check turns away further bookings with 409', async () => {
    const res = await book(pax(1));
    expect(res.status).toBe(409);
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE train_id = ?').get(trainId).n).toBe(1);
  });
});
