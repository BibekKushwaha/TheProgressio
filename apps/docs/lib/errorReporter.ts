/**
 * Lightweight error reporter — Sentry-compatible interface.
 *
 * By default logs structured errors to console.error.
 * Install @sentry/nextjs, set NEXT_PUBLIC_SENTRY_DSN, then call
 * `configureSentry(Sentry.captureException)` from instrumentation.ts
 * to upgrade to full Sentry reporting without changing any call sites.
 *
 * Usage:
 *   reportError(err, { context: 'analytics.overview' })
 *   reportApiError(429, 'getStrategicSummary')
 */

type ErrorContext = Record<string, string | number | boolean | undefined>;

type CaptureException = (error: unknown, context?: ErrorContext) => void;

/** Wired-in Sentry capture function (set once at bootstrap). */
let _capture: CaptureException | null = null;

/**
 * Call once from instrumentation.ts or app bootstrap to wire in Sentry:
 *
 *   import * as Sentry from '@sentry/nextjs';
 *   import { configureSentry } from '@/lib/errorReporter';
 *   configureSentry((err, ctx) => Sentry.captureException(err, { extra: ctx }));
 */
export function configureSentry(captureException: CaptureException): void {
    _capture = captureException;
}

/**
 * Report a caught error. Sends to Sentry if configured, otherwise to
 * console.error so log aggregators / Sentry's console integration can pick it up.
 */
export function reportError(error: unknown, context?: ErrorContext): void {
    if (_capture) {
        _capture(error, context);
        return;
    }
    // Structured log so cloud log monitors can parse severity + context easily.
    console.error('[SAT:error]', JSON.stringify(context ?? {}), error);
}

/**
 * Report an RTK Query API failure.
 * 4xx <= 500 are logged as warnings, 5xx and network errors are full errors.
 */
export function reportApiError(
    status: number | string | undefined,
    endpoint: string,
    data?: unknown,
): void {
    if (status === 429) {
        // Rate limit — warn only, user-facing toast is handled by the RTK middleware
        console.warn('[SAT:rate-limit]', endpoint, data);
        return;
    }
    if (status === 401 || status === 404) {
        // Expected flows — auth refresh handles 401; 404 is a normal not-found
        return;
    }
    if (typeof status === 'number' && status >= 500) {
        reportError(new Error(`API ${status} on ${endpoint}`), {
            endpoint,
            status,
        });
        return;
    }
    if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') {
        reportError(new Error(`Network failure on ${endpoint}`), {
            endpoint,
            status: String(status),
        });
    }
}
