const request = require('supertest');
const app = require('../src/index');

describe('GET /health', () => {
  it('returns HTTP 200 and status ok', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
