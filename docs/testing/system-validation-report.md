# System Validation Report — Railway Reservation System

**Project:** Railway Reservation System (RRS)
**Group:** 5
**Document:** System Validation Report (STP Section 5 — system and acceptance levels)
**Test dates:** 07-11-2026 and 09-11-2026 (full regression), 13-11-2026 (TC-UX-01 walkthrough)
**Build under test:** `dev` branch, v1.0 release candidate onwards
**Environment:** Local development server (`http://localhost:4000`), seeded disposable database

---

## 1. Scope

End-to-end validation of the complete RRS application against the SRS acceptance
criteria and the STP test cases: every functional requirement (RRS-F-001…052),
the performance and usability NFRs (RRS-NF-001/002), the integrity rule
(RRS-NF-003), and the STP Section 5.1 security validation checks (SR-001…005).

## 2. Method

- Full STP regression executed over HTTP by the scripted runner
  `backend/scripts/qa-regression.mjs`, with results cross-checked against the
  SQLite database (27 cases: 22 functional + 5 security).
- Automated Jest + Supertest suite (186 tests, 22 suites) run on the same
  commit — see `unit-test-report.md`.
- TC-UX-01 first-time-user walkthrough performed with a human user.
- TC-Perf-01 response-time measurement (5 sequential requests).

## 3. Results

| Category | Cases | Pass | Fail | Not run |
|---|---:|---:|---:|---:|
| Functional (TC-*) | 20 | 20 | 0 | 0 |
| Security (SR-*) | 5 | 4 | 0 | 1 (SR-005 — documented exception) |
| Performance (TC-Perf-01) | 1 | 1 | 0 | 0 |
| Usability (TC-UX-01) | 1 | 1 | 0 | 0 |
| **Total** | **27** | **26** | **0** | **1** |

Per-case verdicts and evidence are in `test-execution-log.md`.

## 4. Notes and documented exceptions

- **SR-005 (HTTPS):** documented demo-scope exception. The demo runs on
  localhost over HTTP only (README "HTTPS and demo scope"); HTTPS was not
  verified and would require a real deployment. Not counted as a failure.
- **TC-UX-01 (RRS-NF-002):** first-time-user walkthrough completed with a human
  participant on 13-11-2026; booking completed unaided. Recorded PASS.
- **TC-Perf-01 (RRS-NF-001):** average search response 0.929 ms over 5
  sequential requests against the local server — well under the 3-second
  threshold. This is a basic response-time check, not a concurrent load test.
- Payment is the simulated gateway permitted by the SRS; the negative path
  (unsupported method) was verified to reject with HTTP 400 and no seat taken.
- No defects were found during the final regression pass, so no bug issues were
  raised.

## 5. Acceptance-criteria traceability

All SRS Section 6 acceptance criteria are covered by the cases above through
the SRS Section 8 RTM; the same TC IDs are used in the STP test-case appendix
and in `test-execution-log.md`.

## 6. Verdict

**PASS** — the system fulfills the core use cases outlined in the SRS and is
ready for the final demo, subject to the documented SR-005 exception.
