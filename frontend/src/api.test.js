import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './api.js';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
afterEach(() => { globalThis.fetch = originalFetch; globalThis.localStorage = originalStorage; });

describe('shared API helper used by UI-AUTH', () => {
  it('serializes form data and returns a successful response', async () => {
    globalThis.localStorage = { getItem: () => null };
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['Content-Type'], 'application/json');
      assert.equal(options.body, JSON.stringify({ email: 'test@example.test' }));
      return { ok: true, json: async () => ({ id: 1 }) };
    };
    assert.deepEqual(await api('/auth/register', { method: 'POST', body: { email: 'test@example.test' } }), { id: 1 });
  });
  it('preserves409 for field-level duplicate email handling', async () => {
    globalThis.localStorage = { getItem: () => null };
    globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'Email already registered' }) });
    await assert.rejects(api('/auth/register'), error => error.status === 409 && error.message === 'Email already registered');
  });
  it('preserves401 for generic login error handling', async () => {
    globalThis.localStorage = { getItem: () => null };
    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: 'Invalid credentials' }) });
    await assert.rejects(api('/auth/login'), error => error.status === 401);
  });
  it('keeps sending a stored bearer token for existing clients', async () => {
    globalThis.localStorage = { getItem: () => 'test-token' };
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      return { ok: true, json: async () => [] };
    };
    assert.deepEqual(await api('/trains/search'), []);
  });
});
