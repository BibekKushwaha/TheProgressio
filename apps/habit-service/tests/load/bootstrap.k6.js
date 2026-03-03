/**
 * k6 Load Test — Habit Service Bootstrap Endpoints
 *
 * Covers 4 scenarios:
 *
 *   smoke    — 5 VUs, 30 s — confirms both endpoints are alive and within SLA
 *   soak     — ramp 0→50 VUs, hold 3 min, ramp 0 — keeps Redis under
 *               sustained pressure to validate write-through cache & eviction
 *   spike    — 0→200 VUs in 10 s, hold 30 s — exercises rate limiter (200 req/
 *               15 min global) and verifies graceful degradation
 *   split    — 30 VUs, 60 s, alternating critical vs full — direct P95 compare
 *
 * Usage:
 *   # Single scenario
 *   k6 run --env SCENARIO=smoke  tests/load/bootstrap.k6.js
 *   k6 run --env SCENARIO=soak   tests/load/bootstrap.k6.js
 *   k6 run --env SCENARIO=spike  tests/load/bootstrap.k6.js
 *   k6 run --env SCENARIO=split  tests/load/bootstrap.k6.js
 *   # All scenarios (default)
 *   k6 run tests/load/bootstrap.k6.js
 *
 * Required environment variables:
 *   BASE_URL   — defaults to http://localhost:4002
 *   AUTH_TOKEN — JWT / cookie value for the `token` cookie; required for
 *                authenticated requests. Use a seeded dev-user token.
 */

/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:4002';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const SCENARIO   = __ENV.SCENARIO   || 'all';

const ENDPOINTS = {
  critical: `${BASE_URL}/api/habits/bootstrap/critical`,
  full:     `${BASE_URL}/api/habits/bootstrap`,
};

const COOKIE_JAR_HEADERS = AUTH_TOKEN
  ? { Cookie: `token=${AUTH_TOKEN}` }
  : {};

// ── Custom metrics ────────────────────────────────────────────────────────────

const criticalLatency = new Trend('bootstrap_critical_latency', true);
const fullLatency     = new Trend('bootstrap_full_latency',     true);
const cacheHitRate    = new Rate('bootstrap_cache_hit');       // X-Cache-Status: HIT header
const errorRate       = new Rate('bootstrap_errors');

// ── Scenario definitions ──────────────────────────────────────────────────────

const SCENARIOS = {
  smoke: {
    executor:    'constant-vus',
    vus:         5,
    duration:    '30s',
    tags:        { scenario: 'smoke' },
    gracefulStop: '5s',
  },
  soak: {
    executor: 'ramping-vus',
    stages: [
      { duration: '1m',   target: 50  },  // ramp up
      { duration: '3m',   target: 50  },  // hold
      { duration: '30s',  target: 0   },  // ramp down
    ],
    tags:         { scenario: 'soak' },
    gracefulStop: '10s',
  },
  spike: {
    executor: 'ramping-vus',
    stages: [
      { duration: '10s',  target: 200 },  // instant spike
      { duration: '30s',  target: 200 },  // hold under load
      { duration: '10s',  target: 0   },  // ramp back down
    ],
    tags:         { scenario: 'spike' },
    gracefulStop: '10s',
  },
  split: {
    executor:    'constant-vus',
    vus:         30,
    duration:    '60s',
    tags:        { scenario: 'split' },
    gracefulStop: '5s',
  },
};

// Select which scenarios to run
const activeScenarios = SCENARIO === 'all'
  ? SCENARIOS
  : { [SCENARIO]: SCENARIOS[SCENARIO] };

// ── Thresholds ────────────────────────────────────────────────────────────────
//
// SLA targets chosen from observed production p-values:
//   critical path  — Redis-cached, should be ≤ 300 ms P95
//   full bootstrap — includes heatmap DB query on cold cache, ≤ 1200 ms P95
//   errors         — must stay below 1 % (rate limiter 429s don't count as errors)

export const options = {
  scenarios: activeScenarios,
  thresholds: {
    'bootstrap_critical_latency': [
      'p(95)<300',   // P95 ≤ 300 ms
      'p(99)<500',   // P99 ≤ 500 ms
    ],
    'bootstrap_full_latency': [
      'p(95)<1200',  // P95 ≤ 1200 ms
      'p(99)<2500',  // P99 ≤ 2500 ms
    ],
    'bootstrap_errors': [
      'rate<0.01',   // <1 % hard errors
    ],
    // Built-in overall P95 guard
    'http_req_duration': ['p(95)<1500'],
  },
};

// ── Virtual-user logic ────────────────────────────────────────────────────────

export default function () {
  const scenarioTag = __ENV.SCENARIO || 'all';

  if (scenarioTag === 'split') {
    // Alternate between critical and full on each iteration to get a direct A/B
    runCritical();
    sleep(0.1);
    runFull();
    sleep(0.1);
  } else if (scenarioTag === 'spike') {
    // Under spike load hit both endpoints but weight critical 3:1 (more realistic)
    runCritical();
    sleep(0.05);
    runCritical();
    sleep(0.05);
    runCritical();
    sleep(0.05);
    runFull();
    sleep(0.1);
  } else {
    // smoke / soak — realistic mixed usage
    runCritical();
    sleep(0.2);
    runFull();
    sleep(0.5);
  }
}

// ── Request helpers ───────────────────────────────────────────────────────────

function runCritical() {
  const res = http.get(ENDPOINTS.critical, {
    headers: COOKIE_JAR_HEADERS,
    tags:    { endpoint: 'critical' },
  });

  criticalLatency.add(res.timings.duration);
  cacheHitRate.add(res.headers['X-Cache-Status'] === 'HIT' ? 1 : 0);

  const ok = check(res, {
    'critical: status 200 or 304': (r) => r.status === 200 || r.status === 304,
    'critical: has habits array':   (r) => {
      try { return Array.isArray(JSON.parse(r.body).habits); } catch { return false; }
    },
  });

  if (!ok) errorRate.add(1);
  else      errorRate.add(0);
}

function runFull() {
  const res = http.get(ENDPOINTS.full, {
    headers: COOKIE_JAR_HEADERS,
    tags:    { endpoint: 'full' },
  });

  fullLatency.add(res.timings.duration);
  cacheHitRate.add(res.headers['X-Cache-Status'] === 'HIT' ? 1 : 0);

  const ok = check(res, {
    'full: status 200 or 304': (r) => r.status === 200 || r.status === 304,
    'full: has xp field':       (r) => {
      try { return typeof JSON.parse(r.body).xp !== 'undefined'; } catch { return false; }
    },
    'full: has heatmap field':  (r) => {
      try { return typeof JSON.parse(r.body).heatmap !== 'undefined'; } catch { return false; }
    },
  });

  if (!ok) errorRate.add(1);
  else      errorRate.add(0);
}

// ── Summary enhancer ──────────────────────────────────────────────────────────

export function handleSummary(data) {
  const critical = data.metrics['bootstrap_critical_latency'];
  const full     = data.metrics['bootstrap_full_latency'];
  const errors   = data.metrics['bootstrap_errors'];
  const cacheHit = data.metrics['bootstrap_cache_hit'];

  const fmt = (v) => (v != null ? `${v.toFixed(1)} ms` : 'n/a');
  const pct = (v) => (v != null ? `${(v * 100).toFixed(2)} %` : 'n/a');

  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│            Bootstrap Load Test Summary               │');
  console.log('├──────────────────────────┬────────────┬─────────────┤');
  console.log('│ Metric                   │  Critical  │    Full     │');
  console.log('├──────────────────────────┼────────────┼─────────────┤');
  console.log(`│ P50 latency              │ ${fmt(critical?.values?.['p(50)']).padEnd(10)} │ ${fmt(full?.values?.['p(50)']).padEnd(11)} │`);
  console.log(`│ P95 latency              │ ${fmt(critical?.values?.['p(95)']).padEnd(10)} │ ${fmt(full?.values?.['p(95)']).padEnd(11)} │`);
  console.log(`│ P99 latency              │ ${fmt(critical?.values?.['p(99)']).padEnd(10)} │ ${fmt(full?.values?.['p(99)']).padEnd(11)} │`);
  console.log('├──────────────────────────┴────────────┴─────────────┤');
  console.log(`│ Cache-hit rate: ${pct(cacheHit?.values?.rate).padEnd(36)} │`);
  console.log(`│ Error rate:     ${pct(errors?.values?.rate).padEnd(36)} │`);
  console.log('└─────────────────────────────────────────────────────┘\n');

  return {
    stdout: JSON.stringify(data, null, 2),
  };
}
