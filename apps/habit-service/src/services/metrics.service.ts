// ── Named counters ────────────────────────────────────────────────────────────

type MetricName =
    | "duplicate_prevention_hits"
    | "reschedule_operations"
    | "failed_scheduling_attempts"
    | "deduplicated_count"
    | "skipped_due_to_quiet_hours"
    | "wa_fallback_cancelled_by_activity";

const counters = new Map<MetricName, number>();

const toMetricKey = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');

export const incrementMetric = (name: MetricName, by: number = 1): void => {
    counters.set(name, (counters.get(name) ?? 0) + by);
};

export const getMetricsSnapshot = (): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, value] of counters.entries()) {
        result[key] = value;
    }
    return result;
};

export const logMetricEvent = (event: string, payload: Record<string, unknown>): void => {
    console.info(`[Metrics] ${event}`, payload);
};

// ── Per-endpoint latency histograms ───────────────────────────────────────────
//
// Uses fixed exponential upper-bounds (ms) that cover the full range from
// sub-millisecond Redis hits to multi-second worst-case responses.
// Compatible with Prometheus `histogram_quantile` bucket convention.

const LATENCY_BUCKETS_MS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, Infinity] as const;

interface LatencyHistogram {
    /** buckets[i] = count of observations ≤ LATENCY_BUCKETS_MS[i] */
    buckets: number[];
    count: number;
    sum: number;
}

function createHistogram(): LatencyHistogram {
    return { buckets: Array(LATENCY_BUCKETS_MS.length).fill(0), count: 0, sum: 0 };
}

/** Mutable map — keyed by `"METHOD /route/path"`, e.g. `"GET /api/habits/bootstrap"` */
const histograms = new Map<string, LatencyHistogram>();

/**
 * Record a single latency observation for an endpoint.
 *
 * @param endpoint  — Human-readable key, typically `"${req.method} ${req.route?.path ?? req.path}"`
 * @param durationMs — Wall-clock duration measured by the Express timing middleware
 */
export function recordLatency(endpoint: string, durationMs: number): void {
    let h = histograms.get(endpoint);
    if (!h) {
        h = createHistogram();
        histograms.set(endpoint, h);
    }
    h.count += 1;
    h.sum += durationMs;
    for (let i = 0; i < LATENCY_BUCKETS_MS.length; i++) {
        // `i` is always within array bounds — non-null assertions are safe here
        if (durationMs <= LATENCY_BUCKETS_MS[i]!) {
            h.buckets[i] = (h.buckets[i] ?? 0) + 1;
        }
    }
}

/**
 * Compute the p-th percentile (0–100) from a histogram.
 * Returns −1 when no observations have been recorded.
 */
export function getPercentile(endpoint: string, p: number): number {
    const h = histograms.get(endpoint);
    if (!h || h.count === 0) return -1;

    const target = Math.ceil((p / 100) * h.count);
    let cumulative = 0;
    for (let i = 0; i < LATENCY_BUCKETS_MS.length; i++) {
        // `i` is always within array bounds — non-null assertions are safe here
        cumulative += (h.buckets[i] ?? 0);
        if (cumulative >= target) {
            const bound = LATENCY_BUCKETS_MS[i]!;
            return bound === Infinity ? h.sum / h.count : bound;
        }
    }
    return h.sum / h.count;
}

export interface EndpointLatencyStats {
    p50: number;
    p95: number;
    p99: number;
    count: number;
    mean: number;
}

/**
 * Returns a snapshot of all per-endpoint latency stats.
 * Intended for the existing `GET /api/habits/internal/metrics` handler.
 */
export function getLatencySnapshot(): Record<string, EndpointLatencyStats> {
    const result: Record<string, EndpointLatencyStats> = {};
    for (const [endpoint, h] of histograms.entries()) {
        if (h.count === 0) continue;
        result[endpoint] = {
            p50: getPercentile(endpoint, 50),
            p95: getPercentile(endpoint, 95),
            p99: getPercentile(endpoint, 99),
            count: h.count,
            mean: Math.round(h.sum / h.count),
        };
    }
    return result;
}

export function getOperationalMetricsSnapshot(): Record<string, number> {
    const snapshot: Record<string, number> = {
        ...getMetricsSnapshot(),
    };

    for (const [endpoint, stats] of Object.entries(getLatencySnapshot())) {
        const key = toMetricKey(endpoint);
        snapshot[`latency_${key}_count`] = stats.count;
        snapshot[`latency_${key}_mean_ms`] = stats.mean;
        snapshot[`latency_${key}_p50_ms`] = stats.p50;
        snapshot[`latency_${key}_p95_ms`] = stats.p95;
        snapshot[`latency_${key}_p99_ms`] = stats.p99;
    }

    return snapshot;
}

/** Reset all histograms — useful in tests. */
export function resetLatencyHistogramsForTests(): void {
    histograms.clear();
}
