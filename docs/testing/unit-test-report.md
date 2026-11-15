# Unit Test Report — Railway Reservation System

**Project:** Railway Reservation System (RRS)
**Group:** 5
**Document:** Unit Test Report (STP Section 5 — unit level)
**Test date:** 15-11-2026
**Build under test:** `dev` branch (head after v1.0 release, commit `288f4f1`)
**Environment:** Node.js 22, Jest 29 + Supertest 7, seeded disposable SQLite database

---

## 1. Scope

Module-level automated tests for the RRS backend, per the unit level defined in
STP Section 5 (Test Approach). Covers the Auth, Search, Booking/Payment,
Cancellation, PNR/History and Admin modules, plus input validation and the
no-overbooking integrity rule (RRS-NF-003).

## 2. Execution

Command (from `backend/`):

```bash
npm test        # jest --runInBand
```

The suite spins up the Express app against a disposable seeded database via
Supertest; no external services are required (payment gateway is the simulated
endpoint allowed by the SRS).

## 3. Results

| Metric | Result |
|---|---|
| Test suites | 22 passed / 22 total |
| Tests | **186 passed / 186 total** |
| Failures | 0 |
| Duration | ~4.2 s |

### Suites

| Suite | Module / requirement coverage |
|---|---|
| auth.register.test.js | Registration (RRS-F-001) |
| auth.login.test.js | Login (RRS-F-002) |
| auth.test.js | Session/JWT middleware (RRS-F-003, RRS-SR-002) |
| auth.booking.integration.test.js | Auth + booking integration |
| admin.addtrain.test.js | Admin add train (RRS-F-050) |
| admin.listtrains.test.js | Admin list trains (RRS-F-050) |
| admin.updatetrain.test.js | Admin update train (RRS-F-051) |
| admin.rbac.test.js | Role-based access control (RRS-SR-004) |
| admin.viewbookings.test.js | Admin bookings view (RRS-F-052) |
| booking.test.js | Booking creation (RRS-F-020) |
| booking.seatcheck.test.js | Seat availability checks (RRS-F-021) |
| booking.payment.test.js | Simulated payment step (RRS-F-022) |
| booking.pnr.test.js | PNR generation (RRS-F-023) |
| booking.cancel.test.js | Cancellation (RRS-F-030/031) |
| booking.history-cancel.test.js | History after cancellation |
| overbooking.test.js | No over-booking, concurrency (RRS-NF-003) |
| pnr.status.test.js | PNR status enquiry (RRS-F-040) |
| pnr.history.test.js | Booking history (RRS-F-041) |
| pnr.confirm.test.js | PNR confirmation flow |
| validation.test.js | Input validation (RRS-SR-003) |
| health.test.js | API health check |
| trains.test.js | Train search (RRS-F-010/011/012) |

## 4. Verdict

**PASS** — all 186 unit/integration tests pass on the v1.0 codebase. Code and
branch coverage from the same run are recorded in
`code-coverage-report.md` and `branch-coverage-report.md`.
