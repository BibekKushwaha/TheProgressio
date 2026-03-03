/**
 * k6 Load Test Suite — 50K User Stress Scenarios (Step 9)
 *
 * Simulates the 3 danger scenarios from the architectural blueprint:
 *
 * Scenario A: 500 users → /stats/overview (analytics hot path)
 *   Target: p95 < 300ms
 *   Tests: Pre-aggregated DailyUserStats reads under peak Analytics load
 *
 * Scenario B: 200 users → /stats/strategic-summary (CPU-heavy path)
 *   Target: p95 < 2000ms
 *   Tests: Monte Carlo + SWOT under concurrent load
 *
 * Scenario C: 50 users → POST /stats/export (export stress)
 *   Target: All requests return 202 immediately (< 100ms)
 *   Tests: Async export queue (never blocks main thread)
 *
 * Failure criteria (thresholds):
 *   - http_req_failed rate < 1% for all scenarios
 *   - p95 latency within scenario-specific targets
 *
 * Run:
 *   k6 run load-tests/k6-scenarios.js \
 *     -e BASE_URL=http://localhost:4003 \
 *     -e JWT_TOKEN=<your_test_token>
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ── Custom Metrics ──────────────────────────────────────────────────────
const overviewLatency = new Trend("scenario_a_overview_latency");
const strategicLatency = new Trend("scenario_b_strategic_latency");
const exportLatency = new Trend("scenario_c_export_latency");
const failedRequests = new Rate("failed_requests");
const exportJobsQueued = new Counter("export_jobs_queued");

// ── Configuration ──────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:4003";
const JWT_TOKEN = __ENV.JWT_TOKEN || "your-test-jwt-token";

const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${JWT_TOKEN}`,
};

// ── Test Options ───────────────────────────────────────────────────────
export const options = {
    scenarios: {
        // ── Scenario A: Analytics Overview (500 concurrent) ──────────────
        // Simulates 750 concurrent analytics dashboard loads at peak.
        // Using 500 VUs here to maintain k6 overhead headroom.
        scenario_a_overview: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "30s", target: 100 },  // Warm up
                { duration: "60s", target: 500 },  // Peak load
                { duration: "30s", target: 500 },  // Sustain
                { duration: "30s", target: 0 },    // Wind down
            ],
            exec: "testOverview",
            tags: { scenario: "A_overview" },
        },

        // ── Scenario B: Strategic Analytics (200 concurrent) ─────────────
        // CPU-heavy: SWOT + Monte Carlo + CGPA all computed per request.
        // Cache miss rate here is intentionally high (different examTypes).
        scenario_b_strategic: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "30s", target: 50 },
                { duration: "60s", target: 200 },
                { duration: "60s", target: 200 },
                { duration: "30s", target: 0 },
            ],
            exec: "testStrategic",
            startTime: "30s", // Start after Scenario A ramps up
            tags: { scenario: "B_strategic" },
        },

        // ── Scenario C: Concurrent Exports (50 concurrent) ───────────────
        // Tests that exports never block the main thread.
        // All requests should return 202 Accepted in < 100ms.
        scenario_c_exports: {
            executor: "constant-vus",
            vus: 50,
            duration: "60s",
            exec: "testExport",
            startTime: "60s", // Start at peak of Scenario A
            tags: { scenario: "C_export" },
        },
    },

    thresholds: {
        // Scenario A: p95 latency < 300ms for analytics overview
        "scenario_a_overview_latency{scenario:A_overview}": ["p(95)<300"],
        // Scenario B: p95 latency < 2000ms for strategic (prediction-heavy)
        "scenario_b_strategic_latency{scenario:B_strategic}": ["p(95)<2000"],
        // Scenario C: p95 latency < 200ms for async export (should be near-instant)
        "scenario_c_export_latency{scenario:C_export}": ["p(95)<200"],
        // Global: less than 1% failure rate across all scenarios
        "failed_requests": ["rate<0.01"],
        // Standard k6 threshold: overall p95 < 3s
        "http_req_duration": ["p(95)<3000"],
    },
};

// ── Scenario A: Analytics Overview ─────────────────────────────────────
export function testOverview() {
    const days = Math.floor(Math.random() * 7) + 1; // 1-7 days
    const url = `${BASE_URL}/api/stats/overview?days=${days}`;

    const start = Date.now();
    const res = http.get(url, { headers, tags: { name: "overview" } });
    const duration = Date.now() - start;

    overviewLatency.add(duration);

    const success = check(res, {
        "overview: status 200": (r) => r.status === 200,
        "overview: has daily array": (r) => {
            try {
                const body = JSON.parse(r.body);
                return Array.isArray(body.daily);
            } catch {
                return false;
            }
        },
        "overview: has rolling totals": (r) => {
            try {
                const body = JSON.parse(r.body);
                return typeof body.rolling?.totalFocusMinutes === "number";
            } catch {
                return false;
            }
        },
    });

    failedRequests.add(!success);
    sleep(Math.random() * 2 + 0.5); // 0.5–2.5s think time
}

// ── Scenario B: Strategic Analytics ────────────────────────────────────
export function testStrategic() {
    const examTypes = ["JEE", "NEET", "UPSC"];
    const examType = examTypes[Math.floor(Math.random() * examTypes.length)];
    const url = `${BASE_URL}/api/stats/strategic-summary?examType=${examType}`;

    const start = Date.now();
    const res = http.get(url, { headers, tags: { name: "strategic" } });
    const duration = Date.now() - start;

    strategicLatency.add(duration);

    const success = check(res, {
        "strategic: status 200": (r) => r.status === 200,
        "strategic: has SWOT data": (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.swot !== undefined;
            } catch {
                return false;
            }
        },
        "strategic: has peak data": (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.peak?.peakWindow !== undefined;
            } catch {
                return false;
            }
        },
    });

    failedRequests.add(!success);
    sleep(Math.random() * 3 + 1); // 1–4s think time (heavy page)
}

// ── Scenario C: Async Export ────────────────────────────────────────────
export function testExport() {
    const exportTypes = ["CSV_TASKS", "CSV_GRADES"];
    const type = exportTypes[Math.floor(Math.random() * exportTypes.length)];
    const url = `${BASE_URL}/api/stats/export`;

    const payload = JSON.stringify({ type });

    const start = Date.now();
    const res = http.post(url, payload, { headers, tags: { name: "export" } });
    const duration = Date.now() - start;

    exportLatency.add(duration);

    const success = check(res, {
        "export: status 202 (queued, not blocking)": (r) => r.status === 202,
        "export: returns exportJobId immediately": (r) => {
            try {
                const body = JSON.parse(r.body);
                return typeof body.exportJobId === "string";
            } catch {
                return false;
            }
        },
        "export: response time < 500ms (non-blocking)": () => duration < 500,
    });

    if (success) {
        exportJobsQueued.add(1);

        // Poll the job status (simulates client polling)
        try {
            const body = JSON.parse(res.body);
            if (body.exportJobId) {
                sleep(2); // Wait before polling
                const statusRes = http.get(
                    `${BASE_URL}/api/stats/export/${body.exportJobId}`,
                    { headers, tags: { name: "export_poll" } }
                );
                check(statusRes, {
                    "export poll: status 200": (r) => r.status === 200,
                    "export poll: has status field": (r) => {
                        try {
                            const b = JSON.parse(r.body);
                            return ["PENDING", "PROCESSING", "DONE", "FAILED"].includes(b.job?.status);
                        } catch {
                            return false;
                        }
                    },
                });
            }
        } catch {
            // Ignore JSON parse errors
        }
    }

    failedRequests.add(!success);
    sleep(Math.random() * 5 + 2); // 2–7s think time (export is infrequent)
}

// ── Summary Reporting ──────────────────────────────────────────────────
export function handleSummary(data) {
    const summary = {
        timestamp: new Date().toISOString(),
        scenarios: {
            A_overview: {
                p50: data.metrics["scenario_a_overview_latency"]?.values?.["p(50)"],
                p95: data.metrics["scenario_a_overview_latency"]?.values?.["p(95)"],
                target_p95_ms: 300,
                passed: (data.metrics["scenario_a_overview_latency"]?.values?.["p(95)"] ?? 999999) < 300,
            },
            B_strategic: {
                p50: data.metrics["scenario_b_strategic_latency"]?.values?.["p(50)"],
                p95: data.metrics["scenario_b_strategic_latency"]?.values?.["p(95)"],
                target_p95_ms: 2000,
                passed: (data.metrics["scenario_b_strategic_latency"]?.values?.["p(95)"] ?? 999999) < 2000,
            },
            C_export: {
                p50: data.metrics["scenario_c_export_latency"]?.values?.["p(50)"],
                p95: data.metrics["scenario_c_export_latency"]?.values?.["p(95)"],
                target_p95_ms: 200,
                passed: (data.metrics["scenario_c_export_latency"]?.values?.["p(95)"] ?? 999999) < 200,
                jobs_queued: data.metrics["export_jobs_queued"]?.values?.count,
            },
        },
        failure_rate: data.metrics["failed_requests"]?.values?.rate,
        failure_rate_target: "< 1%",
        failure_passed: (data.metrics["failed_requests"]?.values?.rate ?? 1) < 0.01,
    };

    return {
        stdout: JSON.stringify(summary, null, 2),
        "load-tests/results/k6-summary.json": JSON.stringify(summary, null, 2),
    };
}
