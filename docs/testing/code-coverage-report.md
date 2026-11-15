# Code Coverage Report — Railway Reservation System

**Project:** Railway Reservation System (RRS)
**Group:** 5
**Document:** Code Coverage Report (STP Section 14 — requirement coverage metric)
**Test date:** 15-11-2026
**Build under test:** `dev` branch (v1.0, commit `288f4f1`)
**Tool:** Jest 29 built-in coverage (Istanbul)

---

## 1. Execution

```bash
cd backend
npx jest --runInBand --coverage
```

186 tests across 22 suites, all passing. Coverage is measured over the backend
source (`src/`), exercised through the Jest + Supertest suite.

## 2. Summary

| Metric | Covered | Total | % |
|---|---:|---:|---:|
| Statements | 372 | 398 | **93.46%** |
| Branches | 232 | 256 | **90.62%** |
| Functions | 43 | 44 | **97.72%** |
| Lines | 359 | 384 | **93.48%** |

## 3. Per-file coverage

| File | % Stmts | % Branch | % Funcs | % Lines | Uncovered lines |
|---|---:|---:|---:|---:|---|
| src/db.js | 100.00 | 100.00 | 100.00 | 100.00 | — |
| src/index.js | 90.00 | 75.00 | 50.00 | 90.00 | 26-27 |
| src/middleware/auth.js | 100.00 | 100.00 | 100.00 | 100.00 | — |
| src/middleware/requireAdmin.js | 100.00 | 100.00 | 100.00 | 100.00 | — |
| src/routes/admin.routes.js | 93.96 | 87.50 | 100.00 | 93.91 | 40,71,169,177,204,212,229 |
| src/routes/auth.routes.js | 96.00 | 92.42 | 100.00 | 95.77 | 43,96,123 |
| src/routes/booking.routes.js | 89.06 | 88.46 | 100.00 | 88.88 | 87,127,131,165,182-186 |
| src/routes/pnr.routes.js | 95.00 | 100.00 | 100.00 | 95.00 | 84 |
| src/routes/search.routes.js | 88.23 | 100.00 | 100.00 | 87.50 | 67-68 |
| src/utils/confirmBooking.js | 83.33 | 50.00 | 100.00 | 86.66 | 30-33 |
| src/utils/payment.js | 100.00 | 100.00 | 100.00 | 100.00 | — |
| src/utils/pnr.js | 100.00 | 100.00 | 100.00 | 100.00 | — |
| src/utils/validate.js | 100.00 | 100.00 | 100.00 | 100.00 | — |

## 4. Notes

- Both middleware modules (`auth`, `requireAdmin`) and three of four utility
  modules are at 100% on every metric.
- Uncovered lines are concentrated in defensive error branches (database
  failure fallbacks and rare validation edges) in the admin and booking routes
  and in the startup path of `index.js`, which only runs outside the test
  harness.
- Branch-level detail is reported separately in `branch-coverage-report.md`.

## 5. Verdict

Overall line/statement coverage of ~93.5% and function coverage of 97.7% exceed
the level expected for this project's scope; all uncovered paths are defensive
branches, not untested features.
