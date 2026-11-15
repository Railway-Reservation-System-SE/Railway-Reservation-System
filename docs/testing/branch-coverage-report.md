# Branch Coverage Report — Railway Reservation System

**Project:** Railway Reservation System (RRS)
**Group:** 5
**Document:** Branch Coverage Report (STP Section 14 — requirement coverage metric)
**Test date:** 15-11-2026
**Build under test:** `dev` branch (v1.0, commit `288f4f1`)
**Tool:** Jest 29 built-in coverage (Istanbul)

---

## 1. Execution

```bash
cd backend
npx jest --runInBand --coverage
```

Same run as `code-coverage-report.md`: 186 tests, 22 suites, all passing.

## 2. Summary

| Metric | Covered | Total | % |
|---|---:|---:|---:|
| **Branches** | **232** | **256** | **90.62%** |

(For statements/functions/lines see `code-coverage-report.md`.)

## 3. Per-file branch coverage

| File | % Branch | Uncovered branches (line refs) |
|---|---:|---|
| src/db.js | 100.00 | — |
| src/index.js | 75.00 | 26-27 (startup/listen path) |
| src/middleware/auth.js | 100.00 | — |
| src/middleware/requireAdmin.js | 100.00 | — |
| src/routes/admin.routes.js | 87.50 | 40,71,169,177,204,212,229 |
| src/routes/auth.routes.js | 92.42 | 43,96,123 |
| src/routes/booking.routes.js | 88.46 | 87,127,131,165,182-186 |
| src/routes/pnr.routes.js | 100.00 | — |
| src/routes/search.routes.js | 100.00 | — |
| src/utils/confirmBooking.js | 50.00 | 30-33 (error fallback) |
| src/utils/payment.js | 100.00 | — |
| src/utils/pnr.js | 100.00 | — |
| src/utils/validate.js | 100.00 | — |

## 4. Decision-point coverage notes

The suites exercise both arms of the significant decision points, including:

- Authentication: valid token / no token / malformed token / expired token
- RBAC: admin vs non-admin on every admin endpoint
- Booking: 0 passengers, >4 passengers, seats available, seats exhausted,
  last-seat boundary, over-booking attempt (including concurrent attempts in
  `overbooking.test.js`)
- Payment: supported simulated methods and an unsupported method rejected
  with HTTP 400
- Cancellation: valid cancel, already-cancelled, booking belonging to another
  user, non-existent booking
- Input validation: SQL-injection and XSS payloads rejected/sanitized

Uncovered branches are defensive database-error fallbacks and startup-only
code paths that cannot be triggered through the HTTP test harness.

## 5. Verdict

**90.62%** branch coverage with all feature-level decision points exercised on
both arms; remaining uncovered branches are defensive error paths.
