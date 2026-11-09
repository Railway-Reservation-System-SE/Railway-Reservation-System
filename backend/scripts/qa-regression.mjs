// QA-REGRESSION (issue #42) scripted manual-pass runner.
// Drives the seeded local server over HTTP and verifies results against the DB.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:4000';
// Same database the app and seed use: <repo root>/db/railway.db (see src/db.js),
// overridable with DATABASE_PATH exactly like the app.
const dbPath =
  process.env.DATABASE_PATH ||
  path.join(__dirname, '..', '..', 'db', 'railway.db');
const serverLogPath = path.join(os.tmpdir(), 'rrs-server.log');

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}. Seed it first: npm --prefix backend run seed`);
  process.exit(1);
}

// Snapshot the seeded database so this run leaves no test data behind and a
// repeat run starts from the same state (restored in the finally block once
// the server has exited). For a completely fresh pass instead, reseed first:
//   rm db/railway.db && npm --prefix backend run seed
const backupPath = `${dbPath}.qa-backup`;
fs.copyFileSync(dbPath, backupPath);

const results = [];
function record(id, name, pass, evidence) {
  results.push({ id, name, pass, evidence });
  const label = pass === null ? 'NOT-RUN' : pass ? 'PASS' : 'FAIL';
  console.log(`${label} ${id}: ${name}`);
}
const j = (r) => r.json().catch(() => ({}));
function req(method, url, { token, body } = {}) {
  return fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const pax = (n) => Array.from({ length: n }, (_, i) => ({ name: `QA Passenger ${i + 1}`, age: 30 + i, gender: 'M' }));
const db = () => new Database(dbPath, { readonly: true });
function datePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- boot server ---
fs.rmSync(serverLogPath, { force: true });
const serverLog = fs.openSync(serverLogPath, 'w');
const server = spawn('node', ['src/index.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: '4000', JWT_SECRET: 'qa-regression-secret' },
  stdio: ['ignore', serverLog, serverLog],
});
async function waitUp() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + '/health'); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}

try {
  await waitUp();
  const stamp = new Date().toISOString();

  // TC-Reg-01 / TC-Auth-01
  const email = `qa.reg.${Date.now()}@example.com`;
  let r = await req('POST', '/auth/register', { body: { name: 'QA Reg User', email, password: 'secret123' } });
  const regOk = r.status === 201;
  r = await req('POST', '/auth/login', { body: { email, password: 'secret123' } });
  const loginBody = await j(r);
  const userToken = loginBody.token;
  record('TC-Reg-01', 'Register then immediate login', regOk && r.status === 200 && !!userToken,
    `register=${regOk ? 201 : 'fail'}, login=${r.status}, token issued=${!!userToken}`);

  r = await req('POST', '/auth/login', { body: { email, password: 'wrong-pass' } });
  record('TC-Auth-01', 'Correct creds grant access; wrong creds rejected', !!userToken && r.status === 401,
    `correct=200 token, wrong=${r.status}`);

  // TC-Auth-02: protected route without a token
  r = await req('GET', '/bookings/me');
  const noTok = r.status;
  r = await req('GET', '/bookings/me', { token: 'not.a.token' });
  record('TC-Auth-02', 'Protected routes inaccessible without valid session', noTok === 401 && r.status === 401,
    `no token=${noTok}, malformed token=${r.status} (JWT logout is client-side token discard)`);

  // TC-Auth-03: password reset flow
  await req('POST', '/auth/request-password-reset', { body: { email } });
  await new Promise((r2) => setTimeout(r2, 300));
  const logTxt = fs.readFileSync(serverLogPath, 'utf8');
  const m = logTxt.match(/reset-password\?token=([A-Za-z0-9_\-.]+)/);
  const resetToken = m && m[1];
  r = await req('POST', '/auth/reset-password', { body: { token: resetToken, newPassword: 'newsecret456' } });
  const resetOk = r.status === 200;
  const rOld = await req('POST', '/auth/login', { body: { email, password: 'secret123' } });
  const rNew = await req('POST', '/auth/login', { body: { email, password: 'newsecret456' } });
  const nb = await j(rNew);
  record('TC-Auth-03', 'Reset link sets new password; new password logs in', resetOk && rOld.status === 401 && rNew.status === 200,
    `reset=${r.status}, old pw login=${rOld.status}, new pw login=${rNew.status}`);
  const userToken2 = nb.token || userToken;

  // TC-Search-01/02, TC-Fare-01
  const d3 = datePlus(3);
  r = await req('GET', `/trains/search?source=Bengaluru&destination=Chennai&date=${d3}`);
  const search = await j(r);
  const trains = search.trains || search;
  const shatabdi = (Array.isArray(trains) ? trains : []).find((t) => t.number === '12007');
  record('TC-Search-01', 'Search returns trains for route/date', r.status === 200 && !!shatabdi,
    `status=${r.status}, found 12007 Shatabdi=${!!shatabdi} on ${d3}`);

  const dbc = db();
  const dbClasses = dbc.prepare(
    `SELECT tc.class_name, tc.fare, tc.total_seats, tc.booked_seats FROM train_classes tc JOIN trains t ON t.id=tc.train_id WHERE t.number='12007'`).all();
  const apiClasses = shatabdi ? (shatabdi.classes || []) : [];
  const seatMatch = dbClasses.every((c) => {
    const a = apiClasses.find((x) => x.class_name === c.class_name || x.className === c.class_name);
    if (!a) return false;
    const apiAvail = a.seatsAvailable;
    return apiAvail === c.total_seats - c.booked_seats;
  });
  record('TC-Search-02', 'Displayed seat counts match database', !!shatabdi && seatMatch,
    `db=${JSON.stringify(dbClasses.map(c => [c.class_name, c.total_seats - c.booked_seats]))} api=${JSON.stringify(apiClasses.map(c => [c.class_name, c.seatsAvailable]))}`);

  const fareMatch = dbClasses.every((c) => {
    const a = apiClasses.find((x) => (x.class_name ?? x.className) === c.class_name);
    return a && a.fare === c.fare;
  });
  record('TC-Fare-01', 'Displayed fares match stored fares', !!shatabdi && fareMatch,
    `db fares=${JSON.stringify(dbClasses.map(c => [c.class_name, c.fare]))} api=${JSON.stringify(apiClasses.map(c => [c.class_name ?? c.className, c.fare]))}`);

  // ids for booking tests
  const train12007 = dbc.prepare(`SELECT id FROM trains WHERE number='12007'`).get();
  const train12627 = dbc.prepare(`SELECT id FROM trains WHERE number='12627'`).get();

  // TC-Book-01: reject 0 and >4 passengers
  r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12627.id, classType: 'SL', travelDate: datePlus(1), passengers: [], paymentMethod: 'upi' } });
  const s0 = r.status;
  r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12627.id, classType: 'SL', travelDate: datePlus(1), passengers: pax(5), paymentMethod: 'upi' } });
  record('TC-Book-01', 'Booking form rejects 0 or >4 passengers', s0 === 400 && r.status === 400,
    `0 pax=${s0}, 5 pax=${r.status}`);

  // TC-Book-02 / TC-Integrity-01: 2A on 12007 has 25 seats
  let booked = 0; const attempts = [];
  for (let i = 0; i < 6; i++) {
    r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12007.id, classType: '2A', travelDate: d3, passengers: pax(4), paymentMethod: 'card' } });
    attempts.push(r.status); if (r.status === 201) booked += 4;
  }
  r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12007.id, classType: '2A', travelDate: d3, passengers: pax(4), paymentMethod: 'card' } });
  const overBy4 = r.status; const overBody = await j(r);
  r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12007.id, classType: '2A', travelDate: d3, passengers: pax(1), paymentMethod: 'card' } });
  const fillLast = r.status;
  r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12007.id, classType: '2A', travelDate: d3, passengers: pax(1), paymentMethod: 'card' } });
  const beyondFull = r.status;
  const dbBooked2A = dbc.prepare(`SELECT booked_seats FROM train_classes WHERE train_id=? AND class_name='2A'`).get(train12007.id).booked_seats;
  const b02pass = attempts.every((s) => s === 201) && overBy4 === 409 && fillLast === 201 && beyondFull === 409 && dbBooked2A === 25;
  record('TC-Book-02', 'Booking beyond available seats rejected', b02pass,
    `6x4pax=${attempts.join('/')}, 4-over-1-remaining=${overBy4} (${overBody.error || ''}), last seat=${fillLast}, beyond full=${beyondFull}, db booked=${dbBooked2A}/25`);
  record('TC-Integrity-01', 'No over-booking beyond capacity', dbBooked2A === 25 && beyondFull === 409,
    `class capped at 25/25; extra booking rejected ${beyondFull}; concurrency covered by Jest overbooking.test.js`);

  // TC-Pay-01: invalid payment method -> no booking, no seat taken
  const before = dbc.prepare(`SELECT booked_seats FROM train_classes WHERE train_id=? AND class_name='3A'`).get(train12627.id).booked_seats;
  r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12627.id, classType: '3A', travelDate: datePlus(1), passengers: pax(1), paymentMethod: 'cheque' } });
  const payFail = r.status;
  const after = dbc.prepare(`SELECT booked_seats FROM train_classes WHERE train_id=? AND class_name='3A'`).get(train12627.id).booked_seats;
  record('TC-Pay-01', 'Booking confirmed only after payment success', payFail === 400 && before === after,
    `invalid method=${payFail}, seats unchanged ${before}->${after} (gateway is simulated: any of card/upi/netbanking succeeds)`);

  // TC-Pay-02: PNR generated, seats decrease
  r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12627.id, classType: '3A', travelDate: datePlus(1), passengers: pax(2), paymentMethod: 'upi' } });
  const bk = await j(r);
  const afterPay = dbc.prepare(`SELECT booked_seats FROM train_classes WHERE train_id=? AND class_name='3A'`).get(train12627.id).booked_seats;
  record('TC-Pay-02', 'PNR generated and seat count decreases', r.status === 201 && !!bk.pnr && afterPay === before + 2,
    `status=${r.status}, pnr=${bk.pnr}, seats ${before}->${afterPay}`);

  // TC-PNR-01 valid + invalid
  r = await req('GET', `/bookings/pnr/${bk.pnr}`);
  const pnrOk = r.status === 200;
  const pnrBody = await j(r);
  const rBad = await req('GET', '/bookings/pnr/INVALIDPNR1');
  record('TC-PNR-01', 'PNR status correct for valid PNR; error for invalid', pnrOk && (pnrBody.status === 'CONFIRMED') && rBad.status >= 400,
    `valid=${r.status} status=${pnrBody.status}, invalid=${rBad.status}`);

  // TC-History-01: list matches DB, most recent first
  r = await req('GET', '/bookings/me', { token: userToken2 });
  const hist = await j(r);
  const list = hist.bookings || hist;
  const ids = (Array.isArray(list) ? list : []).map((b) => b.id);
  const sorted = ids.every((v, i) => i === 0 || ids[i - 1] >= v);
  const meRow = dbc.prepare(`SELECT id FROM users WHERE email=?`).get(email);
  const dbCount = dbc.prepare(`SELECT COUNT(*) c FROM bookings WHERE user_id=?`).get(meRow.id).c;
  record('TC-History-01', 'Booking history matches user bookings, most recent first', r.status === 200 && ids.length === dbCount && sorted,
    `api count=${ids.length}, db count=${dbCount}, desc order=${sorted}`);

  // TC-Cancel-01/02/03: cancel the 2-pax booking
  const target = (Array.isArray(list) ? list : []).find((b) => b.pnr === bk.pnr);
  const preCancel = dbc.prepare(`SELECT booked_seats FROM train_classes WHERE train_id=? AND class_name='3A'`).get(train12627.id).booked_seats;
  r = await req('POST', `/bookings/${target.id}/cancel`, { token: userToken2 });
  const cancelBody = await j(r);
  const postCancel = dbc.prepare(`SELECT booked_seats FROM train_classes WHERE train_id=? AND class_name='3A'`).get(train12627.id).booked_seats;
  const cancelStatus = dbc.prepare(`SELECT status FROM bookings WHERE id=?`).get(target.id).status;
  record('TC-Cancel-01', 'Cancelled booking status becomes Cancelled', r.status === 200 && cancelStatus === 'CANCELLED',
    `http=${r.status}, db status=${cancelStatus}`);
  record('TC-Cancel-02', 'Seat count increases by cancelled passenger count', postCancel === preCancel - 2,
    `seats ${preCancel}->${postCancel}`);
  record('TC-Cancel-03', 'Confirmation message shown after cancellation', r.status === 200 && /cancel/i.test(JSON.stringify(cancelBody)),
    `response=${JSON.stringify(cancelBody).slice(0, 160)}`);

  // PNR shows Cancelled after cancel (extends TC-PNR-01 evidence)
  r = await req('GET', `/bookings/pnr/${bk.pnr}`);
  const pnrCancel = await j(r);

  // Admin tests
  r = await req('POST', '/auth/login', { body: { email: 'admin@rrs.test', password: 'admin123' } });
  const adminTok = (await j(r)).token;
  // TC-Admin-01: add train appears in search
  const d6 = datePlus(6);
  r = await req('POST', '/admin/trains', { token: adminTok, body: { number: '16525', name: 'QA Express', source: 'Bengaluru', destination: 'Mysuru', travelDate: d6, classes: [{ class_name: 'SL', fare: 120, totalSeats: 50 }] } });
  const addStatus = r.status;
  r = await req('GET', `/trains/search?source=Bengaluru&destination=Mysuru&date=${d6}`);
  const foundNew = JSON.stringify(await j(r)).includes('16525');
  record('TC-Admin-01', 'Newly added train appears in passenger search', addStatus === 201 && foundNew,
    `add=${addStatus}, search finds 16525=${foundNew}`);
  // TC-Admin-02: update then delete reflected
  const newTrain = dbc.prepare(`SELECT id FROM trains WHERE number='16525'`).get();
  r = await req('PUT', `/admin/trains/${newTrain.id}`, { token: adminTok, body: { name: 'QA Express Updated' } });
  const updStatus = r.status;
  r = await req('GET', `/trains/search?source=Bengaluru&destination=Mysuru&date=${d6}`);
  const updShown = JSON.stringify(await j(r)).includes('QA Express Updated');
  r = await req('DELETE', `/admin/trains/${newTrain.id}`, { token: adminTok });
  const delStatus = r.status;
  r = await req('GET', `/trains/search?source=Bengaluru&destination=Mysuru&date=${d6}`);
  const goneAfterDelete = !JSON.stringify(await j(r)).includes('16525');
  record('TC-Admin-02', 'Updated/removed train reflected in searches', updStatus === 200 && updShown && delStatus === 200 && goneAfterDelete,
    `update=${updStatus} shown=${updShown}, delete=${delStatus} removed from search=${goneAfterDelete}`);
  // TC-Admin-03: bookings list matches confirmed bookings
  r = await req('GET', `/admin/trains/${train12007.id}/bookings`, { token: adminTok });
  const adminBookings = await j(r);
  const ab = adminBookings.bookings || adminBookings;
  const dbCount12007 = dbc.prepare(`SELECT COUNT(*) c FROM bookings WHERE train_id=? AND status='CONFIRMED'`).get(train12007.id).c;
  const apiConfirmed = (Array.isArray(ab) ? ab : []).filter((b) => (b.status || '').toUpperCase() === 'CONFIRMED').length;
  record('TC-Admin-03', 'Admin booking list matches confirmed bookings', r.status === 200 && apiConfirmed === dbCount12007,
    `api confirmed=${apiConfirmed}, db confirmed=${dbCount12007}`);

  // TC-Perf-01: search response time < 3s, 5 iterations
  const times = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    r = await req('GET', `/trains/search?source=Bengaluru&destination=Chennai&date=${d3}`);
    await j(r);
    times.push(Math.round((performance.now() - t0) * 1000) / 1000);
  }
  const perfOk = times.every((t) => t < 3000) && times.length === 5;
  record('TC-Perf-01', 'Search responds within 3 seconds', perfOk,
    `times(ms)=${times.join(', ')}, avg=${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(3)} (sequential, local dev server)`);

  // TC-UX-01: first-time-user walkthrough needs a human
  record('TC-UX-01', 'First-time user completes booking unaided', null,
    'NOT RUN by agent: requires a first-time human user walkthrough; teammate acceptance walkthrough still outstanding');

  // Security checks (STP 5.1 / SRS SR-001..005)
  const hashRow = dbc.prepare(`SELECT password_hash FROM users WHERE email=?`).get(email);
  dbc.close();
  record('SR-001', 'Passwords stored hashed, not plaintext', /^\$2[aby]\$/.test(hashRow.password_hash),
    `hash prefix=${hashRow.password_hash.slice(0, 7)}... (bcrypt)`);
  r = await req('POST', '/bookings', { body: { trainId: train12627.id, classType: 'SL', travelDate: datePlus(1), passengers: pax(1), paymentMethod: 'upi' } });
  const noAuthBook = r.status;
  r = await req('GET', `/admin/trains`, {});
  const noAuthAdmin = r.status;
  record('SR-002', 'Booking/admin actions require valid session token', noAuthBook === 401 && noAuthAdmin === 401,
    `booking no-token=${noAuthBook}, admin no-token=${noAuthAdmin}`);
  r = await req('POST', '/auth/login', { body: { email: "' OR '1'='1' --", password: 'x' } });
  const sqli = r.status;
  r = await req('POST', '/bookings', { token: userToken2, body: { trainId: train12627.id, classType: 'SL', travelDate: datePlus(1), passengers: [{ name: '<script>alert(1)</script>', age: 25, gender: 'F' }], paymentMethod: 'upi' } });
  const xssBook = await j(r);
  r = await req('GET', `/bookings/pnr/${xssBook.pnr}`);
  const xssStored = JSON.stringify(await j(r));
  const xssSanitized = !xssStored.includes('<script>');
  record('SR-003', 'Input validation blocks SQLi/XSS', sqli === 401 && xssSanitized,
    `sqli login=${sqli} (no bypass), xss passenger stored=${xssSanitized ? 'sanitized' : 'RAW!'}`);
  r = await req('POST', '/admin/trains', { token: userToken2, body: { number: '00000', name: 'X', source: 'A', destination: 'B', travelDate: d6, classes: [{ class_name: 'SL', fare: 1, totalSeats: 1 }] } });
  record('SR-004', 'Admin-only actions blocked for non-admin', r.status === 403, `non-admin add-train=${r.status}`);
  record('SR-005', 'HTTPS on all connections', null,
    'DOCUMENTED EXCEPTION: local classroom demo runs on localhost HTTP only (README + issue #41); HTTPS not verified - would need a real deployment');

  console.log('\n=== SUMMARY ===');
  const pass = results.filter((x) => x.pass === true).length;
  const fail = results.filter((x) => x.pass === false).length;
  const na = results.filter((x) => x.pass === null).length;
  console.log(`pass=${pass} fail=${fail} not-run/exception=${na} at ${stamp}`);
  fs.writeFileSync(path.join(os.tmpdir(), 'regression-results.json'), JSON.stringify({ stamp, results }, null, 2));
} finally {
  server.kill();
  await new Promise((resolve) => {
    const t = setTimeout(resolve, 3000);
    server.once('exit', () => { clearTimeout(t); resolve(); });
  });
  // Restore the pre-run database so reruns start from the same seeded state.
  try {
    fs.copyFileSync(backupPath, dbPath);
    for (const suffix of ['-wal', '-shm', '-journal']) fs.rmSync(dbPath + suffix, { force: true });
  } finally {
    fs.rmSync(backupPath, { force: true });
  }
}
