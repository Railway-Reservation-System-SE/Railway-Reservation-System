const { isNonEmptyString, isPositiveNumber, isValidDate, stripHtml } = require('../src/utils/validate');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const request = require('supertest');
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'validation-test-only';
const app = require('../src/index');
const db = require('../src/db');
beforeAll(() => {
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
  db.prepare('INSERT INTO trains(number,name,source,destination,travel_date) VALUES(?,?,?,?,?)').run('VAL', 'Validation', 'A', 'B', '2099-01-01');
  db.prepare('INSERT INTO train_classes(train_id,class_name,fare,total_seats) VALUES(?,?,?,?)').run(1, 'SL', 100, 4);
});
afterAll(() => db.close());
const body = () => ({ trainId: 1, classType: 'SL', travelDate: '2099-01-01', passengers: [{ name: 'Traveller', age: 30, gender: 'F' }] });
const post = (data) => request(app).post('/bookings').set('Authorization', `Bearer ${jwt.sign({ userId: 1, role: 'passenger' }, process.env.JWT_SECRET)}`).send(data);

describe('SR003 shared validator primitives', () => {
  it('handles empty/non-string values', () => {
    expect(isNonEmptyString(' x ')).toBe(true);
    for (const value of ['', ' ', null, {}, 0]) expect(isNonEmptyString(value)).toBe(false);
  });
  it('requires finite positive numeric values', () => {
    expect(isPositiveNumber(1)).toBe(true);
    for (const value of [0, -1, Infinity, NaN, '1', null]) expect(isPositiveNumber(value)).toBe(false);
  });
  it('validates real dates and today/future vs past without UTC day drift', () => {
    const today = new Date(2030, 2, 1, 0, 5);
    expect(isValidDate('2030-03-01', today)).toBe(true);
    expect(isValidDate('2030-03-02', today)).toBe(true);
    for (const date of ['2030-02-28', '2030-02-30', '2030-13-01', '03-01-2030', '', null]) expect(isValidDate(date, today)).toBe(false);
    expect(isValidDate('2032-02-29', today)).toBe(true);
  });
  it('strips tags and trims names; no full HTML-sanitizer claim', () => {
    expect(stripHtml(' <b>Asha</b> ')).toBe('Asha');
    expect(stripHtml('<img src=x onerror=alert(1)>')).toBe('');
    expect(stripHtml(null)).toBe('');
  });
});

describe('SR003 booking half only', () => {
  it('rejects negative passenger age without writes', async () => {
    const data = body(); data.passengers[0].age = -1;
    expect((await post(data)).status).toBe(400);
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n).toBe(0);
    expect(db.prepare('SELECT booked_seats FROM train_classes').get().booked_seats).toBe(0);
  });
  it('permits infant age0 and tagged plain-text name without creating a booking', async () => {
    const data = body(); data.passengers[0] = { name: '<b>Baby</b>', age: 0, gender: 'F' };
    expect((await post(data)).status).toBe(501);
  });
  it('rejects a name that becomes empty after tag removal', async () => {
    const data = body(); data.passengers[0].name = '<img src=x>';
    expect((await post(data)).status).toBe(400);
  });
  it.each(['2000-01-01', '2099-02-30', 'not-a-date'])('rejects invalid or past travelDate %s', async (travelDate) => {
    expect((await post({ ...body(), travelDate })).status).toBe(400);
  });
});
