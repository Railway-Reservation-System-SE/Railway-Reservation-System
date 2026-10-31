const fs = require('fs');
const path = require('path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const db = require('../src/db');
const { generatePnr } = require('../src/utils/pnr');
const { confirmBooking } = require('../src/utils/confirmBooking');

let trainId;
let classId;
let userId;
const pax = (n) => Array.from({ length: n }, (_, i) => ({ name: `P${i}`, age: 30, gender: 'F' }));
const seats = () => db.prepare('SELECT booked_seats FROM train_classes WHERE id = ?').get(classId).booked_seats;
const book = (n) =>
  confirmBooking({ userId, classId, trainId, className: 'SL', travelDate: '2031-04-01', passengers: pax(n), farePaid: 500 * n });

beforeAll(() => {
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
  userId = Number(
    db.prepare("INSERT INTO users (name,email,password_hash) VALUES ('U','pnr-test@example.com','x')").run().lastInsertRowid
  );
  trainId = Number(
    db.prepare("INSERT INTO trains (number,name,source,destination,travel_date) VALUES ('T-PNR','PNR Express','A','B','2031-04-01')").run()
      .lastInsertRowid
  );
  classId = Number(
    db.prepare("INSERT INTO train_classes (train_id,class_name,fare,total_seats) VALUES (?, 'SL', 500, 3)").run(trainId).lastInsertRowid
  );
});

afterAll(() => {
  db.prepare('DELETE FROM bookings WHERE train_id = ?').run(trainId);
  db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
  db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
});

describe('generatePnr', () => {
  it('returns a 10-digit numeric string', () => {
    for (let i = 0; i < 50; i += 1) expect(generatePnr()).toMatch(/^\d{10}$/);
  });
});

describe('confirmBooking (RRS-F-023 / RRS-NF-003)', () => {
  it('stores a CONFIRMED booking and raises booked_seats by the passenger count', () => {
    const result = book(2);
    expect(result.pnr).toMatch(/^\d{10}$/);
    const row = db.prepare('SELECT status, fare_paid FROM bookings WHERE pnr = ?').get(result.pnr);
    expect(row).toEqual({ status: 'CONFIRMED', fare_paid: 1000 });
    expect(seats()).toBe(2);
  });

  it('refuses a booking that would exceed capacity and writes nothing', () => {
    const before = db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE train_id = ?').get(trainId).n;
    expect(book(2)).toBeNull();
    expect(seats()).toBe(2);
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE train_id = ?').get(trainId).n).toBe(before);
  });

  it('lets the last seat be taken exactly once', () => {
    expect(book(1)).not.toBeNull();
    expect(book(1)).toBeNull();
    expect(seats()).toBe(3);
  });
});
