/**
 * GlobalErrorBoundary
 *
 * React error boundary that:
 *   1. Catches unhandled JS errors at the component-tree level
 *   2. Reports to Sentry (if configured)
 *   3. Shows a user-friendly retry screen instead of a blank crash
 *
 * Usage: Wrap <App /> once at the root level.
 */
import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { captureError } from '../native/sentry';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

interface Props {
    children: React.ReactNode;
    /** Optional fallback — renders instead of default error screen */
    fallback?: React.ReactNode;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false, error: null, errorInfo: null };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        this.setState({ errorInfo: info });
        captureError(error, { componentStack: info.componentStack ?? '' });
        console.error('[ErrorBoundary]', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        if (this.props.fallback) return this.props.fallback;

        const { error, errorInfo } = this.state;

        return (
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                bounces={false}
            >
                {/* Glow */}
                <View style={styles.glow} />

                <Text style={styles.icon}>💥</Text>
                <Text style={styles.headline}>Something went wrong</Text>
                <Text style={styles.subline}>
                    An unexpected error occurred. The error has been automatically reported.
                </Text>

                {/* Error details card (dev mode only) */}
                {__DEV__ && error && (
                    <View style={styles.devCard}>
                        <Text style={styles.devTitle}>⚠️ Dev Only — Error Details</Text>
                        <Text style={styles.devError}>{error.name}: {error.message}</Text>
                        {errorInfo?.componentStack && (
                            <Text style={styles.devStack} numberOfLines={12}>
                                {errorInfo.componentStack.trim()}
                            </Text>
                        )}
                    </View>
                )}

                {/* Retry button */}
                <TouchableOpacity style={styles.retryBtn} onPress={this.handleReset}>
                    <Text style={styles.retryText}>↺  Try Again</Text>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    If this keeps happening, try restarting the app.
                </Text>
            </ScrollView>
        );
    }
}

// ─── Lightweight screen-level boundary (functional wrapper) ───────────────────

interface ScreenBoundaryProps {
    children: React.ReactNode;
    screenName?: string;
}

interface ScreenBoundaryState {
    hasError: boolean;
}

export class ScreenErrorBoundary extends React.Component<ScreenBoundaryProps, ScreenBoundaryState> {
    state: ScreenBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ScreenBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        captureError(error, {
            screen: this.props.screenName ?? 'unknown',
            componentStack: info.componentStack ?? '',
        });
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <View style={styles.screenError}>
                <Text style={styles.screenErrorIcon}>😔</Text>
                <Text style={styles.screenErrorTitle}>This screen crashed</Text>
                <TouchableOpacity
                    style={styles.screenRetryBtn}
                    onPress={() => this.setState({ hasError: false })}
                >
                    <Text style={styles.screenRetryText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['6'],
        paddingVertical: Spacing['12'],
    },
    glow: {
        position: 'absolute',
        top: -80,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: Colors.error,
        opacity: 0.05,
    },
    icon: { fontSize: 64, marginBottom: Spacing['4'] },
    headline: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize['2xl'],
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: Spacing['2'],
    },
    subline: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing['6'],
    },
    devCard: {
        width: '100%',
        backgroundColor: '#1a0a0a',
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.error + '40',
        padding: Spacing['4'],
        marginBottom: Spacing['6'],
    },
    devTitle: {
        color: Colors.error,
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
    },
    devError: {
        color: '#ff9aa2',
        fontSize: Typography.fontSize.xs,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
        marginBottom: Spacing['2'],
    },
    devStack: {
        color: Colors.textMuted,
        fontSize: 10,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
        lineHeight: 16,
    },
    retryBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.xl,
        paddingHorizontal: Spacing['8'],
        paddingVertical: Spacing['4'],
        marginBottom: Spacing['4'],
        ...Shadow.md,
    },
    retryText: {
        color: '#fff',
        fontSize: Typography.fontSize.base,
        fontWeight: '700',
    },
    hint: {
        color: Colors.textMuted,
        fontSize: Typography.fontSize.xs,
        textAlign: 'center',
    },
    screenError: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background,
        gap: Spacing['3'],
    },
    screenErrorIcon: { fontSize: 40 },
    screenErrorTitle: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.base,
    },
    screenRetryBtn: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing['5'],
        paddingVertical: 10,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    screenRetryText: {
        color: Colors.primaryLight,
        fontSize: Typography.fontSize.sm,
        fontWeight: '600',
    },
});
