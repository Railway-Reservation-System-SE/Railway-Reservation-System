# Testing Documentation — Railway Reservation System

Final testing artifacts for RRS v1.0 (Group 5). Test cases are defined in the
STP (Appendix A) and traced to SRS requirements through the SRS Section 8 RTM.

| Document | Contents |
|---|---|
| `test-execution-log.md` | Full STP regression pass (27 cases): per-case verdicts and evidence, including the STP 5.1 security checks. 26 PASS / 0 FAIL / 1 documented exception (SR-005 HTTPS, localhost demo scope) |
| `unit-test-report.md` | Automated Jest + Supertest suite: 186 tests, 22 suites, all passing |
| `system-validation-report.md` | End-to-end validation against SRS acceptance criteria, including TC-UX-01 first-time-user walkthrough and TC-Perf-01 performance check |
| `code-coverage-report.md` | Istanbul coverage summary: 93.48% lines, 97.72% functions, per-file detail |
| `branch-coverage-report.md` | Branch coverage: 90.62%, decision-point coverage notes |
| `password-reset.md` | Password-reset flow test notes (RRS-F-004) |
| `ui-auth/` | UI evidence screenshots for registration and login |
| `../walkthrough/` | UI walkthrough screenshots (PNR lookup, cancellation) |

Demo videos: `../1-sprint1-demo.mp4` (Sprint 1), `../2-sprint2-demo.mp4` (Sprint 2).
