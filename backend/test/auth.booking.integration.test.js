const fs = require('fs');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'integration-only-secret';
const app = require('../src/index');
const db = require('../src/db');

beforeAll(() => {
  db.exec(fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8'));
  db.prepare('INSERT INTO trains (number,name,source,destination,travel_date) VALUES (?,?,?,?,?)')
    .run('INTEGRATION', 'Integration Train', 'A', 'B', '2031-01-01');
  db.prepare('INSERT INTO train_classes (train_id,class_name,fare,total_seats) VALUES (?,?,?,?)')
    .run(1, 'SL', 100, 4);
});
afterAll(() => db.close());

const payload = {
  trainId: 1,
  classType: 'SL',
  travelDate: '2031-01-01',
  passengers: [{ name: 'Traveller', age: 30, gender: 'F' }],
  paymentMethod: 'card',
};

describe('TC-Reg-01 / TC-Auth-01 integration with RRS-F-020', () => {
  it('registers, immediately logs in and uses the issued token on a protected route', async () => {
    const user = { name: 'Integration User', email: 'integration@example.test', password: 'integration-password', role: 'admin' };
    const registered = await request(app).post('/auth/register').send(user);
    expect(registered.status).toBe(201);
    const login = await request(app).post('/auth/login').send({ email: user.email, password: user.password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe('passenger'); // Cannot self-promote at registration.
    expect(login.body.user.id).toBe(registered.body.id);
    expect(JSON.stringify([registered.body, login.body])).not.toMatch(/password/i);
    const res = await request(app).post('/bookings').set('Authorization', `Bearer ${login.body.token}`).send(payload);
    expect(res.status).toBe(201); // RRS-F-023: the finished route confirms the booking.
    expect(db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n).toBe(1);
    expect(db.prepare('SELECT booked_seats FROM train_classes WHERE id=1').get().booked_seats).toBe(1);
    // Browser logout removes local state only; a copied token has no server revocation.
    const replay = await request(app).post('/bookings').set('Authorization', `Bearer ${login.body.token}`).send(payload);
    expect(replay.status).toBe(201);
  });

  it.each([
    ['missing', null],
    ['malformed', 'not.a.token'],
    ['wrong secret', jwt.sign({ userId: 1, role: 'passenger' }, 'wrong-secret')],
    ['expired', jwt.sign({ userId: 1, role: 'passenger' }, process.env.JWT_SECRET, { expiresIn: -1 })],
    ['missing claims', jwt.sign({}, process.env.JWT_SECRET)],
  ])('rejects %s tokens on every existing protected route', async (_label, token) => {
    for (const route of ['/bookings', '/admin/trains']) {
      let req = request(app).post(route);
      if (token) req = req.set('Authorization', `Bearer ${token}`);
      const res = await req.send({});
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    }
  });
});
