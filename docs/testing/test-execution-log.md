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