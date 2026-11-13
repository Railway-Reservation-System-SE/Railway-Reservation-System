const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');
const { createAdminToken, createPassengerToken } = require('./helpers/adminAuth');

describe('GET /admin/trains (UI-ADMIN support)', () => {
  let admin;
  let passenger;
  let trainId;

  beforeAll(async () => {
    admin = await createAdminToken();
    passenger = await createPassengerToken();
    const created = await request(app)
      .post('/admin/trains')
      .set('Authorization', 'Bearer ' + admin.token)
      .send({
        number: 'T-LIST',
        name: 'List Express',
        source: 'ListSrc',
        destination: 'ListDst',
        travelDate: '2030-06-01',
        classes: [{ class_name: 'SL', fare: 250, totalSeats: 40 }],
      });
    trainId = created.body.id;
  });

  afterAll(() => {
    db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(trainId);
    db.prepare('DELETE FROM trains WHERE id = ?').run(trainId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(admin.userId, passenger.userId);
  });

  test('admin gets the trains with their classes', async () => {
    const res = await request(app).get('/admin/trains').set('Authorization', 'Bearer ' + admin.token);
    expect(res.status).toBe(200);
    const train = res.body.find((t) => t.id === trainId);
    expect(train).toBeDefined();
    expect(train.travelDate).toBe('2030-06-01');
    expect(train.classes).toEqual([{ class_name: 'SL', fare: 250, totalSeats: 40, bookedSeats: 0 }]);
  });

  test('passenger token gets 403', async () => {
    const res = await request(app).get('/admin/trains').set('Authorization', 'Bearer ' + passenger.token);
    expect(res.status).toBe(403);
  });

  test('no token gets 401', async () => {
    const res = await request(app).get('/admin/trains');
    expect(res.status).toBe(401);
  });
});