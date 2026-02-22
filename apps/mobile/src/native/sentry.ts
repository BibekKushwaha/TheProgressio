/**
 * Sentry crash monitoring for React Native / Expo
 *
 * Usage:
 *   import { initSentry } from './sentry';
 *   initSentry();   // call once at app startup, before <App />
 */
import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry() {
    if (!SENTRY_DSN) {
        if (__DEV__) console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash monitoring disabled.');
        return;
    }

    Sentry.init({
        dsn: SENTRY_DSN,
        // Send 20% of performance traces in production
        tracesSampleRate: __DEV__ ? 1.0 : 0.2,
        // Release tracking — set by CI with EXPO_PUBLIC_APP_VERSION
        release: process.env.EXPO_PUBLIC_APP_VERSION,
        environment: __DEV__ ? 'development' : 'production',
        // Breadcrumbs give context leading up to each crash
        maxBreadcrumbs: 50,
        // Attach device info, OS version, etc.
        attachScreenshot: false, // enable manually when you add native modules
        integrations: [
            Sentry.mobileReplayIntegration({ maskAllText: true, maskAllImages: true }),
        ],
    });
}

/**
 * Capture a non-fatal exception without crashing the app.
 * Use this in try-catch blocks where you want telemetry but graceful recovery.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
    if (!SENTRY_DSN) return;

    const err = error instanceof Error ? error : new Error(String(error));
    Sentry.withScope((scope) => {
        if (context) scope.setExtras(context);
        Sentry.captureException(err);
    });
}

/**
 * Set user identity in Sentry when the user logs in.
 * Call this after a successful login, passing the user from authSlice.
 */
export function setSentryUser(user: { id: string; email?: string; name?: string } | null) {
    Sentry.setUser(user);
}

/** Wrap a screen component for automatic component breadcrumbs (optional) */
export const withSentry = Sentry.wrap;
