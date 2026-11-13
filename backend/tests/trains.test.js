
process.env.DATABASE_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/db');

beforeAll(() => {
  db.exec(`
    CREATE TABLE trains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      travel_date TEXT NOT NULL
    );

    CREATE TABLE train_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      train_id INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      fare REAL NOT NULL,
      total_seats INTEGER NOT NULL,
      booked_seats INTEGER NOT NULL DEFAULT 0
    );

    INSERT INTO trains (number, name, source, destination, travel_date)
    VALUES
      ('12007', 'Shatabdi Express', 'Bengaluru', 'Chennai', '2026-11-02'),
      ('12008', 'Test Express', 'Bengaluru', 'Chennai', '2026-11-02');

    INSERT INTO train_classes
      (train_id, class_name, fare, total_seats, booked_seats)
    VALUES
      (1, 'SL', 350, 100, 40),
      (1, '3A', 750, 60, 18),
      (1, '2A', 1100, 30, 30);
  `);
});

describe('GET /trains/search', () => {
  test('returns classes with seatsAvailable and numeric fare', async () => {
    const response = await request(app)
      .get('/trains/search')
      .query({
        source: 'Bengaluru',
        destination: 'Chennai',
        date: '2026-11-02',
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);

    expect(response.body[0]).toMatchObject({
      number: '12007',
      name: 'Shatabdi Express',
      classes: [
        {
          class_name: 'SL',
          seatsAvailable: 60,
          fare: 350,
        },
        {
          class_name: '3A',
          seatsAvailable: 42,
          fare: 750,
        },
        {
          class_name: '2A',
          seatsAvailable: 0,
          fare: 1100,
        },
      ],
    });

    for (const trainClass of response.body[0].classes) {
      expect(typeof trainClass.seatsAvailable).toBe('number');
      expect(typeof trainClass.fare).toBe('number');
      expect(trainClass).not.toHaveProperty('total_seats');
      expect(trainClass).not.toHaveProperty('booked_seats');
      expect(trainClass).not.toHaveProperty('available_seats');
    }
  });

  test('clamps availability to zero when booked seats exceed total seats', async () => {
    db.prepare(`
      INSERT INTO train_classes
        (train_id, class_name, fare, total_seats, booked_seats)
      VALUES (?, ?, ?, ?, ?)
    `).run(2, 'SL', 400, 10, 15);

    try {
      const response = await request(app)
        .get('/trains/search')
        .query({
          source: 'Bengaluru',
          destination: 'Chennai',
          date: '2026-11-02',
        });

      const train = response.body.find((item) => item.number === '12008');

      expect(response.status).toBe(200);
      expect(train.classes).toHaveLength(1);
      expect(train.classes[0]).toMatchObject({
        class_name: 'SL',
        seatsAvailable: 0,
        fare: 400,
      });
    } finally {
      db.prepare('DELETE FROM train_classes WHERE train_id = ?').run(2);
    }
  });

  test('returns an empty classes array when a train has no class records', async () => {
    const response = await request(app)
      .get('/trains/search')
      .query({
        source: 'Bengaluru',
        destination: 'Chennai',
        date: '2026-11-02',
      });

    const train = response.body.find((item) => item.number === '12008');

    expect(response.status).toBe(200);
    expect(train).toBeDefined();
    expect(train.classes).toEqual([]);
  });

  test('matches station names without regard to case', async () => {
    const response = await request(app)
      .get('/trains/search')
      .query({
        source: 'bengaluru',
        destination: 'chennai',
        date: '2026-11-02',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  test('returns 400 when required parameters are missing', async () => {
    const response = await request(app)
      .get('/trains/search')
      .query({ source: 'Bengaluru' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  test('returns 400 for an invalid date format', async () => {
    const response = await request(app)
      .get('/trains/search')
      .query({
        source: 'Bengaluru',
        destination: 'Chennai',
        date: '02-11-2026',
      });

    expect(response.status).toBe(400);
  });

  test('returns an empty array when no trains match', async () => {
    const response = await request(app)
      .get('/trains/search')
      .query({
        source: 'Bengaluru',
        destination: 'Chennai',
        date: '2026-11-30',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

afterAll(() => {
  db.close();
});
