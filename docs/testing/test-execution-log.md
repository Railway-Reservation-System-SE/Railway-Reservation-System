# Test Execution Log — Railway Reservation System

**Project:** Railway Reservation System (RRS)
**Group:** 5
**Requirement:** RRS-NF-001 — Performance
**Test Case ID:** TC-Perf-01
**Tester:** Syed Obaid Faraz
**Test date:** 03-11-2026
**Environment:** Local development server

---

## TC-Perf-01 — Train Search API Response Time

### Objective

Verify that the train search API responds within the required threshold of 3 seconds.

### Test Configuration

| Parameter | Value |
|---|---|
| HTTP method | GET |
| Endpoint | `/trains/search` |
| Test URL | `http://localhost:4000/trains/search?source=Bengaluru&destination=Chennai&date=2026-11-02` |
| Iterations | 5 |
| Expected response time | Under 3 seconds |
| Server | Local development server, port 4000 |
| Execution type | Sequential requests, not concurrent |

### Results

| Iteration | HTTP Status | Response Time |
|---:|---:|---:|
| 1 | 200 | 29.372 ms |
| 2 | 200 | 3.587 ms |
| 3 | 200 | 3.726 ms |
| 4 | 200 | 4.082 ms |
| 5 | 200 | 5.213 ms |

**Average response time:** 9.196 ms
**Maximum response time:** 29.372 ms
**Successful HTTP responses:** 5/5

### Actual Result

All five requests returned HTTP 200. Every measured response time was below the required 3-second threshold.

### Verdict

**PASS**

### Testing Limitation

The five requests were executed sequentially against a local development server. This was a basic response-time verification, not a concurrent load test or production performance benchmark. These results do not establish performance under concurrent user traffic.

---

## Evidence — Command and Output

### PowerShell Command

The following command was executed five times:

```powershell
curl.exe -s -o NUL -w "HTTP Status: %{http_code} | Response Time: %{time_total}s`n" "http://localhost:4000/trains/search?source=Bengaluru&destination=Chennai&date=2026-11-02"
```

### Recorded Output

```text
HTTP Status: 200 | Response Time: 0.029372s
HTTP Status: 200 | Response Time: 0.003587s
HTTP Status: 200 | Response Time: 0.003726s
HTTP Status: 200 | Response Time: 0.004082s
HTTP Status: 200 | Response Time: 0.005213s
```

*Note: These output lines are transcribed from the five measurements previously reported; they are not a separately captured terminal transcript.*

---

**Related Requirement:** RRS-NF-001
**Test Case:** TC-Perf-01
**Test Status:** PASS
---

# QA-REGRESSION - Full STP regression pass (Issue #42)

**Requirement:** All TC-* test cases from the STP (traceability per SRS Section 8 RTM), plus the STP Section 5.1 security checks
**Test date:** 09-11-2026 (rerun after the runner fixes listed under Notes; original pass 07-11-2026)
**Environment:** Local development server (`http://localhost:4000`), seeded disposable database (`npm --prefix backend run seed`)
**Build under test:** `dev` branch app code at commit `9bae85b` (head after PR #82 merge, 05-11-2026; unchanged on this branch, which only adds test tooling). Executed from branch `chore/qa-regression-log`.
**Method:** Every case executed against the running app over HTTP by the scripted runner `backend/scripts/qa-regression.mjs`, with results cross-checked against the SQLite database. The automated Jest + Supertest suite (186 tests, 22 suites) was also run on the same commit: all passed.

## Results

| Test case | Requirement | What was verified | Verdict |
|---|---|---|---|
| TC-Reg-01 | RRS-F-001 | Register then immediate login | PASS |
| TC-Auth-01 | RRS-F-002 | Correct creds grant access; wrong creds rejected | PASS |
| TC-Auth-02 | RRS-F-003 | Protected routes inaccessible without valid session | PASS |
| TC-Auth-03 | RRS-F-004 | Reset link sets new password; new password logs in | PASS |
| TC-Search-01 | RRS-F-010 | Search returns trains for route/date | PASS |
| TC-Search-02 | RRS-F-011 | Displayed seat counts match database | PASS |
| TC-Fare-01 | RRS-F-012 | Displayed fares match stored fares | PASS |
| TC-Book-01 | RRS-F-020 | Booking form rejects 0 or >4 passengers | PASS |
| TC-Book-02 | RRS-F-021 | Booking beyond available seats rejected | PASS |
| TC-Integrity-01 | RRS-NF-003 | No over-booking beyond capacity | PASS |
| TC-Pay-01 | RRS-F-022 | Booking confirmed only after payment success | PASS |
| TC-Pay-02 | RRS-F-023 | PNR generated and seat count decreases | PASS |
| TC-PNR-01 | RRS-F-040 | PNR status correct for valid PNR; error for invalid | PASS |
| TC-History-01 | RRS-F-041 | Booking history matches user bookings, most recent first | PASS |
| TC-Cancel-01 | RRS-F-030 | Cancelled booking status becomes Cancelled | PASS |
| TC-Cancel-02 | RRS-F-031 | Seat count increases by cancelled passenger count | PASS |
| TC-Cancel-03 | RRS-F-032 | Confirmation message shown after cancellation | PASS |
| TC-Admin-01 | RRS-F-050 | Newly added train appears in passenger search | PASS |
| TC-Admin-02 | RRS-F-051 | Updated/removed train reflected in searches | PASS |
| TC-Admin-03 | RRS-F-052 | Admin booking list matches confirmed bookings | PASS |
| TC-Perf-01 | RRS-NF-001 | Search responds within 3 seconds | PASS |
| TC-UX-01 | RRS-NF-002 | First-time user completes booking unaided | NOT RUN |
| SR-001 | RRS-SR-001 | Passwords stored hashed, not plaintext | PASS |
| SR-002 | RRS-SR-002 | Booking/admin actions require valid session token | PASS |
| SR-003 | RRS-SR-003 | Input validation blocks SQLi/XSS | PASS |
| SR-004 | RRS-SR-004 | Admin-only actions blocked for non-admin | PASS |
| SR-005 | RRS-SR-005 | HTTPS on all connections | NOT RUN |

**Totals:** 25 PASS, 0 FAIL, 2 not run by this pass (TC-UX-01, SR-005 - see notes).

## Evidence per case

- **TC-Reg-01** (PASS): register=201, login=200, token issued=true
- **TC-Auth-01** (PASS): correct=200 token, wrong=401
- **TC-Auth-02** (PASS): no token=401, malformed token=401 (JWT logout is client-side token discard)
- **TC-Auth-03** (PASS): reset=200, old pw login=401, new pw login=200
- **TC-Search-01** (PASS): status=200, found 12007 Shatabdi=true on 2026-11-12
- **TC-Search-02** (PASS): db=[["SL",80],["3A",50],["2A",25]] api=[["SL",80],["3A",50],["2A",25]]
- **TC-Fare-01** (PASS): db fares=[["SL",300],["3A",850],["2A",1200]] api=[["SL",300],["3A",850],["2A",1200]]
- **TC-Book-01** (PASS): 0 pax=400, 5 pax=400
- **TC-Book-02** (PASS): 6x4pax=201/201/201/201/201/201, 4-over-1-remaining=409 (Not enough seats available), last seat=201, beyond full=409, db booked=25/25
- **TC-Integrity-01** (PASS): class capped at 25/25; extra booking rejected 409; concurrency covered by Jest overbooking.test.js
- **TC-Pay-01** (PASS): invalid method=400, seats unchanged 0->0 (gateway is simulated: any of card/upi/netbanking succeeds)
- **TC-Pay-02** (PASS): status=201, pnr=7386449820, seats 0->2
- **TC-PNR-01** (PASS): valid=200 status=CONFIRMED, invalid=400
- **TC-History-01** (PASS): api count=8, db count=8, desc order=true
- **TC-Cancel-01** (PASS): http=200, db status=CANCELLED
- **TC-Cancel-02** (PASS): seats 2->0
- **TC-Cancel-03** (PASS): response={"status":"CANCELLED","message":"Booking cancelled, seats released"}
- **TC-Admin-01** (PASS): add=201, search finds 16525=true
- **TC-Admin-02** (PASS): update=200 shown=true, delete=200 removed from search=true
- **TC-Admin-03** (PASS): api confirmed=7, db confirmed=7
- **TC-Perf-01** (PASS): times(ms)=0.922, 0.869, 0.823, 0.818, 1.214, avg=0.929 (sequential, local dev server)
- **TC-UX-01** (NOT RUN): NOT RUN by agent: requires a first-time human user walkthrough; teammate acceptance walkthrough still outstanding
- **SR-001** (PASS): hash prefix=$2b$10$... (bcrypt)
- **SR-002** (PASS): booking no-token=401, admin no-token=401
- **SR-003** (PASS): sqli login=401 (no bypass), xss passenger stored=sanitized
- **SR-004** (PASS): non-admin add-train=403
- **SR-005** (NOT RUN): DOCUMENTED EXCEPTION: local classroom demo runs on localhost HTTP only (README + issue #41); HTTPS not verified - would need a real deployment

## Notes and exceptions

- **TC-UX-01 (RRS-NF-002)** was not run in this pass: it requires a first-time human user to complete a booking unaided. A recorded pass/fail for TC-UX-01 is still needed before issue #42 can be called fully complete (the acceptance check asks for a recorded result for every TC-*).
- **SR-005 (HTTPS)** is a documented demo-scope exception, not a pass: this demo runs on localhost over HTTP only (see README "HTTPS and demo scope"). HTTPS was not verified; it would need a real deployment.
- **TC-Pay-01**: the payment step is a simulated gateway - any of `card`, `upi` or `netbanking` counts as success. The negative path was verified with an unsupported method (`cheque`): booking rejected with HTTP 400 and no seat was taken.
- **TC-Auth-02**: logout discards the JWT client-side; the API correctly rejects requests with no token or a malformed token (HTTP 401). Issued tokens remain valid until their 2-hour expiry (stateless JWT, no server-side revocation).
- **TC-Perf-01**: 5 sequential requests to `GET /trains/search`, all HTTP 200, avg 0.929 ms, max 1.214 ms (matching the evidence above) - well under the 3-second threshold. As with the earlier 03-11-2026 run, this is a basic response-time check on a local server, not a concurrent load test.
- No defects were found in the app in this pass, so no `type:bug` issues or `fix/*` branches were raised (issue #42 step 2).

## Runner fixes (09-11-2026, after review)

- **Database path:** the runner now reads the same database as the app and seed - `db/railway.db` at the repo root (it previously read the non-existent `backend/db/railway.db`, which crashed the pass at TC-Search-02 on a fresh checkout). It also honors the `DATABASE_PATH` environment variable, matching `src/db.js`.
- **Repeat runs:** the runner snapshots the database before the pass and restores it after the server exits, so it leaves no test data behind and a repeat run needs no reseeding. For a completely fresh pass instead, reset first: `rm db/railway.db && npm --prefix backend run seed`.
- **Result labels:** cases not run (TC-UX-01, SR-005) now print as `NOT-RUN` in the per-case output; the summary counts were already correct.
- Verified 09-11-2026 on a fresh seeded checkout: 25 PASS / 0 FAIL / 2 NOT-RUN, identical on an immediate repeat run and with `DATABASE_PATH` pointed at a copied database. The automated Jest + Supertest suite (186 tests, 22 suites) also passes on the same commit.
