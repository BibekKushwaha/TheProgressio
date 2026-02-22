/**
 * Sentry crash monitoring for React Native / Expo.
 * Lazily load SDK to avoid startup crashes from import-time side effects.
 */

import type React from 'react';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

type SentryModule = typeof import('@sentry/react-native');

function getSentry(): SentryModule | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require('@sentry/react-native') as SentryModule;
    } catch (error) {
        if (__DEV__) console.warn('[Sentry] SDK unavailable, continuing without crash reporting:', error);
        return null;
    }
}

export function initSentry() {
    if (!SENTRY_DSN) {
        if (__DEV__) console.warn('[Sentry] EXPO_PUBLIC_SENTRY_DSN not set — crash monitoring disabled.');
        return;
    }

    const Sentry = getSentry();
    if (!Sentry) return;

    try {
        Sentry.init({
            dsn: SENTRY_DSN,
            // Send 20% of performance traces in production
            tracesSampleRate: __DEV__ ? 1.0 : 0.2,
            // Release tracking — set by CI with EXPO_PUBLIC_APP_VERSION
            release: `theprogressio-mobile@${process.env.EXPO_PUBLIC_APP_VERSION}`,
            environment: __DEV__ ? 'development' : 'production',
            // Breadcrumbs give context leading up to each crash
            maxBreadcrumbs: 50,
            // Attach device info, OS version, etc.
            attachScreenshot: false, // enable manually when you add native modules
            // Replay integration can crash early on some RN/Hermes/new-arch combinations.
            integrations: [],
        });
    } catch (error) {
        // Never block app boot because telemetry init fails.
        if (__DEV__) console.warn('[Sentry] init failed, continuing without crash reporting:', error);
    }
}

/**
 * Capture a non-fatal exception without crashing the app.
 * Use this in try-catch blocks where you want telemetry but graceful recovery.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
    if (!SENTRY_DSN) return;
    const Sentry = getSentry();
    if (!Sentry) return;

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
    const Sentry = getSentry();
    if (!Sentry) return;
    Sentry.setUser(user);
}

/** Wrap a screen component for automatic component breadcrumbs (optional) */
export const withSentry = <P extends object>(Component: React.ComponentType<P>) => {
    const Sentry = getSentry();
    if (!Sentry) return Component;
    return Sentry.wrap(Component as React.ComponentType<any>) as React.ComponentType<P>;
};
