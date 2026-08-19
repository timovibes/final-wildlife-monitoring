### Load Test 1 — Baseline (500 concurrent, 30s)

**Setup:** `tests/load/sightings-load-test.js`, run against the seeded dev database.

**Command:**  docker compose exec backend node tests/load/sightings-load-test.js


**Parameters:** 500 concurrent connections, sustained 30 seconds, POST `/api/sightings`

**Results:**

| Metric | Value |
|---|---|
| Requests/sec (avg) | 37.5 |
| Latency (avg) | 8,277 ms |
| Latency (p99) | 9,891 ms |
| Total requests | 1,125 |
| Successful (2xx) | 0 |
| Errors | 369 |
| Timeouts | 369 |

**Finding:** 0 successful requests out of 1,125 attempted. Average latency exceeded 8 seconds, with hundreds of timeouts. The backend could not handle 500 concurrent sighting submissions.

**Likely cause:** `backend/config/database.js` sets a Sequelize connection pool `max: 10` — only 10 simultaneous database connections are allowed regardless of incoming request volume. With 500 concurrent requests, 490 requests queue for a database connection and time out before one becomes available.

### Load Test 2 — After increasing DB connection pool (500 concurrent, 30s)

**Change made:** `backend/config/database.js` — Sequelize pool `max` increased from 10 to 50.

**Command:**

docker compose exec backend node tests/load/sightings-load-test.js


**Parameters:** 500 concurrent connections, sustained 30 seconds, POST `/api/sightings`

**Results:**

| Metric | Load Test 1 | Load Test 2 |
|---|---|---|
| Requests/sec (avg) | 37.5 | 74.87 |
| Latency (avg) | 8,277 ms | 6,073 ms |
| Latency (p99) | 9,891 ms | 9,120 ms |
| Total requests | 1,125 | 2,246 |
| Successful | 0 | 2,246 (all) |
| Errors | 369 | 0 |
| Timeouts | 369 | 0 |

**Finding:** Increasing the database connection pool from 10 to 50 eliminated all errors and timeouts. Throughput roughly doubled. However, average latency remains high (over 6 seconds) — the system now handles the load without failing, but 500 truly simultaneous submissions is still a heavy load for this configuration.

**Next step:** Investigate whether latency improves further with a larger pool, or whether 500 simultaneous submissions is a realistic scenario for this application's actual usage pattern.

### Load Test 3 — Re-run under identical conditions (500 concurrent, 30s)

**Change made:** None — same code as Load Test 2, run again to check consistency.

**Results:**

| Metric | Load Test 2 | Load Test 3 |
|---|---|---|
| Requests/sec (avg) | 74.87 | 35.84 |
| Latency (avg) | 6,073 ms | 3,525 ms |
| Total requests | 2,246 | 1,075 |
| Successful (2xx) | 2,246 | 1,075 |
| Errors | 0 | 1,034 |
| Timeouts | 0 | 1,034 |

**Finding:** With no code changes between Load Test 2 and Load Test 3, results varied significantly — Test 3 showed far more timeouts and fewer completed requests. This indicates load test results on a single developer machine are affected by external factors (other running processes, Docker Desktop's own resource usage, background system load) and a single run should not be treated as a definitive measurement.

**Next step:** Run the same test 3–5 times back to back and record the range, rather than relying on one run, to get a more honest picture of typical performance.