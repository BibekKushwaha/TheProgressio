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

type BrowserErrorPayload = {
    message: string;
    name: string;
    stack?: string;
    context?: ErrorContext;
    href?: string;
    userAgent?: string;
    ts: string;
};

const CLIENT_ERROR_ENDPOINT = '/api/client-errors';
const IGNORED_BROWSER_ERROR_MESSAGES = new Set([
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
]);

/** Wired-in Sentry capture function (set once at bootstrap). */
let _capture: CaptureException | null = null;

const isBrowser = (): boolean => typeof window !== 'undefined';

const normalizeError = (error: unknown): Pick<BrowserErrorPayload, 'message' | 'name' | 'stack'> => {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            ...(error.stack ? { stack: error.stack.slice(0, 4000) } : {}),
        };
    }

    if (typeof error === 'string') {
        return {
            message: error,
            name: 'Error',
        };
    }

    return {
        message: 'Unknown error',
        name: 'UnknownError',
    };
};

const isIgnorableBrowserError = (error: unknown): boolean => {
    const { message } = normalizeError(error);
    return IGNORED_BROWSER_ERROR_MESSAGES.has(message);
};

const emitBrowserError = (error: unknown, context?: ErrorContext): boolean => {
    if (!isBrowser()) return false;

    const payload: BrowserErrorPayload = {
        ...normalizeError(error),
        ...(context ? { context } : {}),
        href: window.location.href,
        userAgent: window.navigator.userAgent,
        ts: new Date().toISOString(),
    };

    try {
        const body = JSON.stringify(payload);
        if (typeof navigator.sendBeacon === 'function') {
            const blob = new Blob([body], { type: 'application/json' });
            return navigator.sendBeacon(CLIENT_ERROR_ENDPOINT, blob);
        }

        void fetch(CLIENT_ERROR_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
        }).catch(() => {
        });
        return true;
    } catch {
        return false;
    }
};

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

export function resetErrorReporterForTests(): void {
    _capture = null;
}

/**
 * Report a caught error. Sends to Sentry if configured, otherwise to
 * console.error so log aggregators / Sentry's console integration can pick it up.
 */
export function reportError(error: unknown, context?: ErrorContext): void {
    if (isIgnorableBrowserError(error)) {
        return;
    }
    if (_capture) {
        _capture(error, context);
        return;
    }
    if (emitBrowserError(error, context)) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('[SAT:error]', JSON.stringify(context ?? {}), error);
        }
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
