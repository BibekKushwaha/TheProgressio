/**
 * API Error Fallback UI
 *
 * A reusable component that renders contextual error states for RTK Query.
 * Use inside any screen's render path when isError is true.
 *
 * Usage:
 *   const { data, isError, error, refetch } = useGetTasksQuery();
 *   if (isError) return <ApiErrorFallback error={error} onRetry={refetch} />;
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

type RTKError = {
    status?: number | string;
    data?: { message?: string };
    error?: string;
};

interface ApiErrorFallbackProps {
    error?: RTKError | unknown;
    onRetry?: () => void;
    /** Override default message */
    message?: string;
    /** Small inline variant — no full-screen takeover */
    inline?: boolean;
}

function getErrorMessage(error: RTKError | unknown): { title: string; detail: string; emoji: string } {
    if (!error) return { title: 'Something went wrong', detail: 'An unknown error occurred.', emoji: '❗' };

    const e = error as RTKError;
    const status = e.status;

    if (status === 401 || status === 403) {
        return { title: 'Access Denied', detail: 'You don\'t have permission to view this. Try logging in again.', emoji: '🔐' };
    }
    if (status === 404) {
        return { title: 'Not Found', detail: 'This resource doesn\'t exist or has been removed.', emoji: '🔍' };
    }
    if (status === 429) {
        return { title: 'Too Many Requests', detail: 'You\'re moving fast! Wait a moment and try again.', emoji: '⏱️' };
    }
    if (status === 503 || status === 500) {
        return { title: 'Server Unavailable', detail: 'Our servers are having trouble. Please try again shortly.', emoji: '🛠️' };
    }
    if (status === 'FETCH_ERROR' || status === 'NETWORK_ERROR') {
        return { title: 'No Connection', detail: 'Check your internet connection and try again. Changes will sync when you\'re back online.', emoji: '📡' };
    }
    if (status === 'TIMEOUT_ERROR') {
        return { title: 'Request Timed Out', detail: 'The request took too long. Please retry.', emoji: '⌛' };
    }

    const serverMessage = e.data?.message ?? e.error;
    return {
        title: 'Something went wrong',
        detail: serverMessage ?? 'An unexpected error occurred.',
        emoji: '😕',
    };
}

export const ApiErrorFallback: React.FC<ApiErrorFallbackProps> = ({
    error,
    onRetry,
    message,
    inline = false,
}) => {
    const { title, detail, emoji } = getErrorMessage(error);

    if (inline) {
        return (
            <View style={styles.inlineWrap}>
                <Text style={styles.inlineEmoji}>{emoji}</Text>
                <Text style={styles.inlineText}>{message ?? detail}</Text>
                {onRetry && (
                    <TouchableOpacity onPress={onRetry} style={styles.inlineRetry}>
                        <Text style={styles.inlineRetryText}>Retry</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={styles.fullWrap}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.detail}>{message ?? detail}</Text>
            {onRetry && (
                <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                    <Text style={styles.retryText}>↺ Try Again</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    fullWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['8'],
        paddingVertical: Spacing['12'],
        backgroundColor: Colors.background,
    },
    emoji: { fontSize: 52, marginBottom: Spacing['3'] },
    title: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xl,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: Spacing['2'],
    },
    detail: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.sm,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing['6'],
    },
    retryBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.xl,
        paddingHorizontal: Spacing['6'],
        paddingVertical: Spacing['3'],
    },
    retryText: {
        color: '#fff',
        fontSize: Typography.fontSize.sm,
        fontWeight: '700',
    },
    // Inline variant
    inlineWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2'],
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.error + '30',
        padding: Spacing['3'],
        marginVertical: Spacing['3'],
    },
    inlineEmoji: { fontSize: 18 },
    inlineText: {
        flex: 1,
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        lineHeight: 18,
    },
    inlineRetry: {
        backgroundColor: Colors.primary + '20',
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['2'],
        paddingVertical: 4,
    },
    inlineRetryText: {
        color: Colors.primaryLight,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
    },
});
