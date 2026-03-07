/**
 * WhatsApp Inbound Audit & Observability
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *
 *  1. Distributed metrics counters  — increments a Redis hash (wa:metrics) so
 *     counters survive restarts and are shared across replicas.  Falls back to
 *     an in-process Map when Redis is unreachable (fail-open).
 *
 *  2. Per-intent latency tracking with p95/p99  — records AI extraction time
 *     in a Redis sorted set keyed by intent for sliding-window percentiles.
 *     In-process buckets hold min/max/avg; Redis sorted set gives p95/p99
 *     across any number of replicas.
 *
 *  3. Shadow moderation log  — when sanitization strips injection patterns the
 *     original message metadata is emitted as a forensic log line for security
 *     review *without* blocking the request.  Full unredacted text is never
 *     written; only pattern names and lengths are stored.
 *
 *  4. Structured audit log  — every inbound webhook message produces one JSON
 *     line written to stdout.  Any log aggregator (Loki, Datadog, CloudWatch)
 *     will pick it up.  Keys are kept stable so dashboards & alert rules don't
 *     break across deploys.
 *
 *  5. Auto-alerting threshold logic  — after every ALERT_CHECK_INTERVAL messages
 *     the error rate, abuse rate, and latency p95 are compared against env-
 *     configurable thresholds.  When a threshold is breached a single
 *     `level: "critical"` log line is emitted, with a per-metric cooldown
 *     stored in Redis so the same alert can't fire again within 5 minutes.
 */

import { getRedisClient } from '@repo/cache';

const toMetricKey = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');

// ── 1. Distributed metrics counters ──────────────────────────────────────────

const METRICS_HASH_KEY = 'wa:metrics';
const metricsCounters  = new Map<string, number>();   // in-process fallback

export function incrementWhatsAppMetric(key: string, amount = 1): void {
    metricsCounters.set(key, (metricsCounters.get(key) ?? 0) + amount);
    void (async () => {
        try {
            const client = getRedisClient() as any;
            await client.hincrby(METRICS_HASH_KEY, key, amount);
        } catch { /* fail-open */ }
    })();
}

export async function getWhatsAppMetrics(): Promise<Record<string, number>> {
    try {
        const client = getRedisClient() as any;
        const raw = (await client.hgetall(METRICS_HASH_KEY)) as Record<string, string> | null;
        if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
            const result: Record<string, number> = {};
            for (const [k, v] of Object.entries(raw)) result[k] = Number(v) || 0;
            return result;
        }
    } catch { /* fall through */ }
    const snapshot: Record<string, number> = {};
    for (const [k, v] of metricsCounters) snapshot[k] = v;
    return snapshot;
}

// ── 2. Per-intent latency tracking (sorted-set sliding window) ───────────────
//
// Sorted set key  : wa:lat:samples:<intent>
// Score           : Unix timestamp in ms (for ZREMRANGEBYSCORE pruning)
// Member          : "<durationMs>|<randomHex>" (random suffix ensures uniqueness)
// Window          : WA_LATENCY_WINDOW_MS env var (default 10 minutes)
//
// p95 / p99 are computed from the sorted-set members inside the window so
// percentiles reflect recent traffic across ALL replicas.

const LAT_WINDOW_MS = Math.max(60_000, Number(process.env.WA_LATENCY_WINDOW_MS ?? '600000'));

interface LatencyBucket {
    count: number;
    sumMs: number;
    minMs: number;
    maxMs: number;
}

const intentLatencyBuckets = new Map<string, LatencyBucket>();

/** Compute a percentile (0-1) from an already-sorted ascending numeric array. */
function percentileFromSorted(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, Math.min(idx, sorted.length - 1))]!;
}

export function recordIntentLatency(intent: string, durationMs: number): void {
    const key   = intent || 'unknown';
    const prior = intentLatencyBuckets.get(key) ?? { count: 0, sumMs: 0, minMs: Number.MAX_SAFE_INTEGER, maxMs: -1 };
    intentLatencyBuckets.set(key, {
        count: prior.count + 1,
        sumMs: prior.sumMs + durationMs,
        minMs: Math.min(prior.minMs, durationMs),
        maxMs: Math.max(prior.maxMs, durationMs),
    });

    void (async () => {
        try {
            const client    = getRedisClient() as any;
            const hashKey   = `wa:lat:${key}`;
            const setKey    = `wa:lat:samples:${key}`;
            const now       = Date.now();
            const member    = `${Math.round(durationMs)}|${Math.random().toString(36).slice(2, 8)}`;

            // Distributed avg accumulation
            await client.hincrby(hashKey, 'cnt', 1);
            await client.hincrby(hashKey, 'sum', Math.round(durationMs));

            // Sliding-window sorted set for percentile computation
            await client.zadd(setKey, now, member);
            // Prune samples older than the window
            await client.zremrangebyscore(setKey, '-inf', now - LAT_WINDOW_MS);
            // Auto-expire the key so it doesn't linger after traffic stops
            await client.expire(setKey, Math.ceil(LAT_WINDOW_MS / 1000) * 2);
        } catch { /* fail-open */ }
    })();
}

export async function getIntentLatencyMetrics(): Promise<Record<string, {
    count: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    p95Ms: number;
    p99Ms: number;
    sampleCount: number;
}>> {
    const result: Record<string, {
        count: number; avgMs: number; minMs: number; maxMs: number;
        p95Ms: number; p99Ms: number; sampleCount: number;
    }> = {};

    // Seed from in-process buckets (holds min / max)
    for (const [intent, bucket] of intentLatencyBuckets) {
        result[intent] = {
            count:       bucket.count,
            avgMs:       bucket.count > 0 ? Math.round(bucket.sumMs / bucket.count) : 0,
            minMs:       bucket.minMs === Number.MAX_SAFE_INTEGER ? 0 : bucket.minMs,
            maxMs:       bucket.maxMs < 0 ? 0 : bucket.maxMs,
            p95Ms:       0,
            p99Ms:       0,
            sampleCount: 0,
        };
    }

    try {
        const client = getRedisClient() as any;
        const now    = Date.now();
        const intents = intentLatencyBuckets.size > 0
            ? [...intentLatencyBuckets.keys()]
            : [];

        for (const intent of intents) {
            const setKey  = `wa:lat:samples:${intent}`;
            const hashKey = `wa:lat:${intent}`;

            // Distributed count + sum for cluster-wide avgMs
            const rawHash = (await client.hgetall(hashKey)) as Record<string, string> | null;
            if (rawHash?.cnt && rawHash?.sum) {
                const cnt = Number(rawHash.cnt);
                if (cnt > 0) {
                    result[intent] = {
                        ...result[intent]!,
                        count: cnt,
                        avgMs: Math.round(Number(rawHash.sum) / cnt),
                    };
                }
            }

            // p95 / p99 from sorted-set sliding window
            const rawMembers = (await client.zrangebyscore(
                setKey, now - LAT_WINDOW_MS, '+inf',
            )) as string[] | null;

            if (Array.isArray(rawMembers) && rawMembers.length > 0) {
                const durations = rawMembers
                    .map((m) => Number(m.split('|')[0]))
                    .filter((n) => Number.isFinite(n) && n >= 0)
                    .sort((a, b) => a - b);

                result[intent] = {
                    ...result[intent]!,
                    sampleCount: durations.length,
                    p95Ms:       percentileFromSorted(durations, 0.95),
                    p99Ms:       percentileFromSorted(durations, 0.99),
                };
            }
        }
    } catch { /* use in-process fallback */ }

    return result;
}

export async function getOperationalMetricsSnapshot(): Promise<Record<string, number>> {
    const [metrics, intentLatency] = await Promise.all([
        getWhatsAppMetrics(),
        getIntentLatencyMetrics(),
    ]);

    const snapshot: Record<string, number> = {
        ...metrics,
    };

    for (const [intent, stats] of Object.entries(intentLatency)) {
        const key = toMetricKey(intent);
        snapshot[`wa_intent_${key}_count`] = stats.count;
        snapshot[`wa_intent_${key}_avg_ms`] = stats.avgMs;
        snapshot[`wa_intent_${key}_min_ms`] = stats.minMs;
        snapshot[`wa_intent_${key}_max_ms`] = stats.maxMs;
        snapshot[`wa_intent_${key}_p95_ms`] = stats.p95Ms;
        snapshot[`wa_intent_${key}_p99_ms`] = stats.p99Ms;
        snapshot[`wa_intent_${key}_sample_count`] = stats.sampleCount;
    }

    return snapshot;
}

// ── 5. Auto-alerting threshold logic ─────────────────────────────────────────
//
// Thresholds (all configurable via env vars):
//   WA_ALERT_ERROR_RATE       — wa_error / wa_total > threshold (default 0.05)
//   WA_ALERT_ABUSE_RATE       — (wa_abuse_blocked + wa_rate_limited) / wa_total
//                                 > threshold (default 0.20)
//   WA_ALERT_LATENCY_P95_MS   — any intent p95 > threshold ms (default 10000)
//   WA_ALERT_OUTBOUND_FAIL_RATE — wa_outbound_failure / (wa_outbound_success +
//                                 wa_outbound_failure) > threshold (default 0.10)
//
// Cooldown: a Redis key `wa:alert:cooldown:<metric>` with 5-minute TTL prevents
// repeat alerts for the same condition within the cooldown window.

const ALERT_CHECK_INTERVAL = 10; // check every N messages to avoid Redis overhead
const ALERT_COOLDOWN_S     = Math.max(60, Number(process.env.WA_ALERT_COOLDOWN_S ?? '300'));

const ALERT_ERROR_RATE       = Math.min(1, Math.max(0, Number(process.env.WA_ALERT_ERROR_RATE       ?? '0.05')));
const ALERT_ABUSE_RATE       = Math.min(1, Math.max(0, Number(process.env.WA_ALERT_ABUSE_RATE       ?? '0.20')));
const ALERT_LATENCY_P95_MS   = Math.max(1000,          Number(process.env.WA_ALERT_LATENCY_P95_MS   ?? '10000'));
const ALERT_OUTBOUND_FAIL_RATE = Math.min(1, Math.max(0, Number(process.env.WA_ALERT_OUTBOUND_FAIL_RATE ?? '0.10')));

async function emitAlertIfNeeded(
    client:      any,
    metricKey:   string,
    value:       number,
    threshold:   number,
    description: string,
): Promise<void> {
    if (value <= threshold) return;
    const cooldownKey = `wa:alert:cooldown:${metricKey}`;
    const existing    = await client.get(cooldownKey).catch(() => null);
    if (existing) return; // still in cooldown
    await client.set(cooldownKey, '1', { ex: ALERT_COOLDOWN_S }).catch(() => null);
    const alertLine: Record<string, unknown> = {
        service:     'planner-service',
        subsystem:   'whatsapp_alert',
        level:       'critical',
        ts:          new Date().toISOString(),
        alert:       metricKey,
        value:       Math.round(value * 10000) / 10000,
        threshold,
        description,
    };
    process.stdout.write(JSON.stringify(alertLine) + '\n');
}

/**
 * Compare current metric snapshot against configured thresholds and emit
 * one `level: "critical"` log line per breached threshold, subject to a
 * per-metric cooldown window stored in Redis.
 */
export async function checkAndEmitAlerts(
    metrics:     Record<string, number>,
    intentStats?: Awaited<ReturnType<typeof getIntentLatencyMetrics>>,
): Promise<void> {
    try {
        const client = getRedisClient() as any;
        const total       = Math.max(1, metrics['wa_total'] ?? 0);
        const errorRate   = (metrics['wa_error'] ?? 0) / total;
        const abuseRate   = ((metrics['wa_abuse_blocked'] ?? 0) + (metrics['wa_rate_limited'] ?? 0)) / total;
        const outSent     = (metrics['wa_outbound_success'] ?? 0) + (metrics['wa_outbound_failure'] ?? 0);
        const outFailRate = outSent > 0 ? (metrics['wa_outbound_failure'] ?? 0) / outSent : 0;

        await Promise.all([
            emitAlertIfNeeded(client, 'error_rate',        errorRate,   ALERT_ERROR_RATE,
                `wa_error / wa_total = ${(errorRate * 100).toFixed(1)}% exceeds ${(ALERT_ERROR_RATE * 100).toFixed(0)}% threshold`),
            emitAlertIfNeeded(client, 'abuse_rate',        abuseRate,   ALERT_ABUSE_RATE,
                `Abuse+rate-limit rate = ${(abuseRate * 100).toFixed(1)}% exceeds ${(ALERT_ABUSE_RATE * 100).toFixed(0)}% threshold`),
            emitAlertIfNeeded(client, 'outbound_fail_rate', outFailRate, ALERT_OUTBOUND_FAIL_RATE,
                `Outbound failure rate = ${(outFailRate * 100).toFixed(1)}% exceeds ${(ALERT_OUTBOUND_FAIL_RATE * 100).toFixed(0)}% threshold`),
        ]);

        if (intentStats) {
            for (const [intent, stats] of Object.entries(intentStats)) {
                if (stats.p95Ms > ALERT_LATENCY_P95_MS) {
                    await emitAlertIfNeeded(
                        client,
                        `latency_p95_${intent}`,
                        stats.p95Ms,
                        ALERT_LATENCY_P95_MS,
                        `Intent "${intent}" p95 latency = ${stats.p95Ms}ms exceeds ${ALERT_LATENCY_P95_MS}ms threshold`,
                    );
                }
            }
        }
    } catch { /* never block audit path */ }
}

// ── 3. Shadow moderation log ─────────────────────────────────────────────────

export interface ShadowModerationEvent {
    ts: string;
    messageId: string | null;
    phoneSuffix: string | null;
    userId: string | null;
    matchedPatterns: string[];
    originalLength: number;
    sanitizedLength: number;
    source: string;
}

export function logShadowModerationEvent(event: ShadowModerationEvent): void {
    incrementWhatsAppMetric('wa_shadow_moderation');
    if (event.matchedPatterns.length > 0) {
        incrementWhatsAppMetric('wa_injection_attempt');
    }
    const line: Record<string, unknown> = {
        service:         'planner-service',
        subsystem:       'whatsapp_shadow_moderation',
        level:           'warn',
        ts:              event.ts,
        messageId:       event.messageId,
        phoneSuffix:     event.phoneSuffix,
        userId:          event.userId,
        source:          event.source,
        patternCount:    event.matchedPatterns.length,
        patterns:        event.matchedPatterns,
        originalLength:  event.originalLength,
        sanitizedLength: event.sanitizedLength,
    };
    process.stdout.write(JSON.stringify(line) + '\n');
}

// ── 4. Structured audit log ───────────────────────────────────────────────────

export type WhatsAppOutcome =
    | 'task_created'
    | 'paired'
    | 'rate_limited'
    | 'abuse_blocked'
    | 'duplicate'
    | 'stale_timestamp'
    | 'parse_failed'
    | 'low_confidence'
    | 'non_create_intent'
    | 'interactive_action'
    | 'pairing_conflict'
    | 'unknown_phone'
    | 'sanitized_empty'
    | 'unsupported_message'
    | 'error';

export interface WhatsAppAuditEvent {
    ts: string;
    messageId: string | null;
    phoneSuffix: string | null;
    userId: string | null;
    outcome: WhatsAppOutcome;
    intent?: string | null;
    confidence?: number | null;
    taskId?: string | null;
    source: string;
    abuseFlagReason?: string | null;
    shadowModeration?: {
        patternCount: number;
        patterns: string[];
        originalLength: number;
    } | null;
    durationMs: number;
}

export function logWhatsAppAuditEvent(event: WhatsAppAuditEvent): void {
    incrementWhatsAppMetric('wa_total');
    incrementWhatsAppMetric(`wa_${event.outcome}`);

    const level: 'info' | 'warn' | 'error' =
        event.outcome === 'error' ? 'error'
        : (
            event.outcome === 'rate_limited' ||
            event.outcome === 'abuse_blocked' ||
            event.outcome === 'stale_timestamp'
        ) ? 'warn'
        : 'info';

    const line: Record<string, unknown> = {
        service:    'planner-service',
        subsystem:  'whatsapp',
        level,
        ts:          event.ts,
        messageId:   event.messageId,
        phoneSuffix: event.phoneSuffix,
        userId:      event.userId,
        outcome:     event.outcome,
        source:      event.source,
        durationMs:  event.durationMs,
    };

    if (event.intent           != null) line['intent']          = event.intent;
    if (event.confidence       != null) line['confidence']      = event.confidence;
    if (event.taskId           != null) line['taskId']          = event.taskId;
    if (event.abuseFlagReason  != null) line['abuseFlagReason'] = event.abuseFlagReason;
    if (event.shadowModeration != null) line['shadowModeration']= event.shadowModeration;

    process.stdout.write(JSON.stringify(line) + '\n');

    // Auto-alerting: fire-and-forget check every ALERT_CHECK_INTERVAL messages
    // to avoid Redis overhead on every single webhook call.
    const total = metricsCounters.get('wa_total') ?? 0;
    if (total % ALERT_CHECK_INTERVAL === 0) {
        void getWhatsAppMetrics().then((metrics) =>
            checkAndEmitAlerts(metrics)
        );
    }
}
