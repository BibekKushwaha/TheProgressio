/**
 * SentryDryRun — DEV ONLY test component
 *
 * Mount temporarily anywhere to verify Sentry is receiving events.
 * Remove or disable before shipping to production.
 *
 * Usage:
 *   import { SentryDryRun } from '../tests/SentryDryRun';
 *   // Inside any screen:
 *   {__DEV__ && <SentryDryRun />}
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { captureError } from '../native/sentry';
import * as Sentry from '@sentry/react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

export const SentryDryRun: React.FC = () => {
    const [thrown, setThrown] = useState(false);

    // This will be caught by GlobalErrorBoundary and reported to Sentry
    if (thrown) {
        throw new Error('[SentryDryRun] Test Crash — verify in Sentry dashboard');
    }

    const handleNonFatal = () => {
        captureError(new Error('[SentryDryRun] Non-fatal test error'), {
            testKey: 'sentry-dry-run',
            timestamp: new Date().toISOString(),
        });
        Alert.alert('✅ Non-fatal sent', 'Check Sentry → Issues for: "SentryDryRun Non-fatal test error"');
    };

    const handleBreadcrumb = () => {
        Sentry.addBreadcrumb({
            category: 'test',
            message: 'Manual breadcrumb from SentryDryRun',
            level: 'info',
            data: { screenName: 'DryRun', triggeredAt: Date.now() },
        });
        Alert.alert('✅ Breadcrumb added', 'Will appear in the next error\'s breadcrumb trail.');
    };

    const handleUserContext = () => {
        Sentry.setUser({ id: 'test-user-123', email: 'test@theprogressio.com', name: 'Test User' });
        Alert.alert('✅ User set', 'Next errors will be tagged with test-user-123');
    };

    const handleJSCrash = () => {
        Alert.alert(
            '⚠️ Test Crash',
            'This will throw a JS error caught by GlobalErrorBoundary and reported to Sentry. Proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Crash It', style: 'destructive', onPress: () => setThrown(true) },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🔬 Sentry Dry Run</Text>
            <Text style={styles.subtitle}>DEV ONLY — Remove before shipping</Text>

            <TouchableOpacity style={[styles.btn, styles.infoBtn]} onPress={handleBreadcrumb}>
                <Text style={styles.btnText}>Add Breadcrumb</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.infoBtn]} onPress={handleUserContext}>
                <Text style={styles.btnText}>Set Test User</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.warnBtn]} onPress={handleNonFatal}>
                <Text style={styles.btnText}>Send Non-Fatal Error</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.dangerBtn]} onPress={handleJSCrash}>
                <Text style={styles.btnText}>💥 Throw JS Crash</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: Spacing['4'],
        padding: Spacing['4'],
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: Colors.error + '40',
        backgroundColor: Colors.error + '08',
        gap: Spacing['2'],
    },
    title: { color: Colors.error, fontSize: Typography.fontSize.base, fontWeight: '700' },
    subtitle: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginBottom: Spacing['2'] },
    btn: {
        paddingVertical: Spacing['3'],
        paddingHorizontal: Spacing['4'],
        borderRadius: Radius.lg,
        alignItems: 'center',
    },
    infoBtn: { backgroundColor: Colors.primary + '20', borderWidth: 1, borderColor: Colors.primary + '40' },
    warnBtn: { backgroundColor: Colors.warning + '20', borderWidth: 1, borderColor: Colors.warning + '40' },
    dangerBtn: { backgroundColor: Colors.error + '20', borderWidth: 1, borderColor: Colors.error + '50' },
    btnText: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
});
