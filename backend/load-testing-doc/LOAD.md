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