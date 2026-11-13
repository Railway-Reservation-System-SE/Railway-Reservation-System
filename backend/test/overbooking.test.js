const fs = require('fs');
const path = require('path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

// RRS-NF-003 / TC-Integrity-01: two requests racing for the last seat must not
// overbook. Exactly one confirms (201), the other is turned away (409), and
// booked_seats never exceeds total_seats. better-sqlite3 runs synchronously on
// one connection, so the guarded UPDATE decides the race atomically.
describe('POST /bookings no-overbooking guard (RRS-NF-003)', () => {
  const RUNS = 5;
  const createdTrainIds = [];
  const createdUserIds = [];

  beforeAll(() => {
    db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
  });

  afterAll(() => {
    for (const trainId of createdTrainIds) {
      db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
      db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
      db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    }
    for (const userId of createdUserIds) {
      db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    }
  });

  it.each(Array.from({ length: RUNS }, (_, i) => i + 1))(
    'run %i: two racers for the last seat -> exactly one 201 and one 409',
    async (run) => {
      const email = `nf003-${Date.now()}-${run}@test.com`;
      await request(app).post('/auth/register').send({ name: 'Race Tester', email, password: 'secret123' });
      const login = await request(app).post('/auth/login').send({ email, password: 'secret123' });
      const token = login.body.token;
      createdUserIds.push(login.body.user.id);

      const train = db
        .prepare('INSERT INTO trains (number, name, source, destination, travel_date) VALUES (?,?,?,?,?)')
        .run(`T-NF003-${run}`, 'Race Express', 'A', 'B', '2031-05-01');
      const trainId = Number(train.lastInsertRowid);
      createdTrainIds.push(trainId);
      // One seat left: exactly one racer can win.
      db.prepare("INSERT INTO train_classes (train_id, class_name, fare, total_seats, booked_seats) VALUES (?, 'SL', 100, 10, 9)").run(trainId);

      const book = () =>
        request(app)
          .post('/bookings')
          .set('Authorization', `Bearer ${token}`)
          .send({
            trainId,
            classType: 'SL',
            travelDate: '2031-05-01',
            passengers: [{ name: 'Racer', age: 30, gender: 'F' }],
            paymentMethod: 'card',
          });

      const [first, second] = await Promise.all([book(), book()]);
      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 409]);

      const row = db.prepare('SELECT booked_seats, total_seats FROM train_classes WHERE train_id = ?').get(trainId);
      expect(row.booked_seats).toBe(10);
      expect(row.booked_seats).toBeLessThanOrEqual(row.total_seats);
      expect(db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE train_id = ?').get(trainId).n).toBe(1);
    }
  );
});
