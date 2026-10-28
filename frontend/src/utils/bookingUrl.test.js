import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildBookingUrl } from './bookingUrl.js';

describe('buildBookingUrl', () => {
  it('keeps the original search date when the form date changes without another search', () => {
    const searchedDate = '2026-11-02';
    const editedFormDate = '2026-11-05';

    // The existing results still use the date captured by the search.
    const url = buildBookingUrl(13, '3A', searchedDate);
    const parsedUrl = new URL(url, 'http://localhost');

    assert.equal(parsedUrl.pathname, '/booking/13');
    assert.equal(parsedUrl.searchParams.get('class'), '3A');
    assert.equal(parsedUrl.searchParams.get('date'), '2026-11-02');
    assert.notEqual(parsedUrl.searchParams.get('date'), editedFormDate);
  });
});