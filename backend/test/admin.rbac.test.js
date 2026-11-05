const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');
const { createAdminToken, createPassengerToken } = require('./helpers/adminAuth');

describe('admin-only access to /admin/* (RRS-SR-004)', () => {
  let admin;
  let passenger;

  beforeAll(async () => {
    admin = await createAdminToken();
    passenger = await createPassengerToken();
  });

  afterAll(() => {
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(admin.userId, passenger.userId);
  });

  const routes = [
    ['post', '/admin/trains'],
    ['put', '/admin/trains/1'],
    ['delete', '/admin/trains/1'],
    ['get', '/admin/trains/1/bookings'],
  ];

  test.each(routes)('passenger token gets 403 on %s %s', async (method, path) => {
    const res = await request(app)[method](path).set('Authorization', `Bearer ${passenger.token}`).send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin access required');
  });

  test.each(routes)('no token gets 401 on %s %s', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });

  test('admin token passes the role check (unknown train gives 404, not 403)', async () => {
    const res = await request(app)
      .get('/admin/trains/999999/bookings')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(404);
  });
});