
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

    INSERT INTO trains (number, name, source, destination, travel_date)
    VALUES (
      '12007',
      'Shatabdi Express',
      'Bengaluru',
      'Chennai',
      '2026-11-02'
    );
  `);
});

describe('GET /trains/search', () => {
  test('returns matching trains with a classes array', async () => {
    const response = await request(app)
      .get('/trains/search')
      .query({
        source: 'Bengaluru',
        destination: 'Chennai',
        date: '2026-11-02',
      });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      number: '12007',
      name: 'Shatabdi Express',
      source: 'Bengaluru',
      destination: 'Chennai',
      travel_date: '2026-11-02',
      classes: [],
    });
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
    expect(response.body).toHaveLength(1);
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
