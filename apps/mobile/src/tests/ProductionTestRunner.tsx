/**
 * ProductionTestRunner — DEV ONLY
 *
 * An interactive screen that runs all production test scenarios in-app.
 * Mount via a hidden gesture in AppEntry (e.g. 5-tap on the logo) or
 * directly via deep link:  transition://dev/test-runner
 *
 * Tests covered:
 *   ① E2E smoke (login → task → habit → focus → kill → reopen)
 *   ② Memory stress (200 tasks, 100 sessions, heatmap)
 *   ③ Deep link validation (all routes)
 *   ④ Offline conflict scenario
 *   ⑤ Sentry dry run
 */
import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { validateDeepLinks } from './deepLinkValidator';
import { runOfflineConflictScenario } from './offlineConflictScenario';
import { generateMockTasks, generateMockSessions, generateHabitHeatmapData, measureRenderTime } from './memoryStressTest';
import { SentryDryRun } from './SentryDryRun';

type Status = 'idle' | 'running' | 'passed' | 'failed';

interface TestResult {
    name: string;
    status: Status;
    detail?: string;
    durationMs?: number;
}

export const ProductionTestRunner: React.FC = () => {
    const [results, setResults] = useState<TestResult[]>([]);
    const [running, setRunning] = useState(false);
    const [showSentry, setShowSentry] = useState(false);

    const updateResult = useCallback((name: string, partial: Partial<TestResult>) => {
        setResults((prev) => {
            const exists = prev.find((r) => r.name === name);
            if (exists) return prev.map((r) => r.name === name ? { ...r, ...partial } : r);
            return [...prev, { name, status: 'idle', ...partial }];
        });
    }, []);

    const runAll = async () => {
        setRunning(true);
        setResults([]);

        // ──────────────────────────────────────────────────────────────────────────
        // TEST 1: Deep Link Validation
        // ──────────────────────────────────────────────────────────────────────────
        updateResult('Deep Links', { status: 'running' });
        const t1Start = Date.now();
        try {
            const { passed, failed, failures } = validateDeepLinks();
            updateResult('Deep Links', {
                status: failed === 0 ? 'passed' : 'failed',
                detail: `${passed} passed, ${failed} failed${failures.length > 0 ? '\n' + failures.slice(0, 3).join('\n') : ''}`,
                durationMs: Date.now() - t1Start,
            });
        } catch (e: any) {
            updateResult('Deep Links', { status: 'failed', detail: e.message, durationMs: Date.now() - t1Start });
        }

        // ──────────────────────────────────────────────────────────────────────────
        // TEST 2: Memory Stress — Data Generation
        // ──────────────────────────────────────────────────────────────────────────
        updateResult('Memory Stress', { status: 'running' });
        const t2Start = Date.now();
        try {
            let maxMs = 0;

            const taskMs = measureRenderTime('200 Tasks', () => generateMockTasks(200));
            maxMs = Math.max(maxMs, taskMs);

            const sessionMs = measureRenderTime('100 Sessions', () => generateMockSessions(100));
            maxMs = Math.max(maxMs, sessionMs);

            const heatmapMs = measureRenderTime('Heatmap 365d', () => generateHabitHeatmapData(365));
            maxMs = Math.max(maxMs, heatmapMs);

            updateResult('Memory Stress', {
                status: maxMs < 100 ? 'passed' : 'failed',
                detail: `tasks: ${taskMs.toFixed(1)}ms | sessions: ${sessionMs.toFixed(1)}ms | heatmap: ${heatmapMs.toFixed(1)}ms${maxMs > 16.7 ? '\n⚠️ Max > 16.7ms (potential frame drop)' : ''}`,
                durationMs: Date.now() - t2Start,
            });
        } catch (e: any) {
            updateResult('Memory Stress', { status: 'failed', detail: e.message, durationMs: Date.now() - t2Start });
        }

        // ──────────────────────────────────────────────────────────────────────────
        // TEST 3: Offline Conflict Scenario
        // ──────────────────────────────────────────────────────────────────────────
        updateResult('Offline Conflict', { status: 'running' });
        const t3Start = Date.now();
        try {
            const { passed, steps } = await runOfflineConflictScenario();
            const failedSteps = steps.filter((s) => !s.ok);
            updateResult('Offline Conflict', {
                status: passed ? 'passed' : 'failed',
                detail: passed
                    ? `All ${steps.length} steps passed`
                    : `Failures:\n${failedSteps.map((s) => `• ${s.step}: ${s.result}`).join('\n')}`,
                durationMs: Date.now() - t3Start,
            });
        } catch (e: any) {
            updateResult('Offline Conflict', { status: 'failed', detail: e.message, durationMs: Date.now() - t3Start });
        }

        // ──────────────────────────────────────────────────────────────────────────
        // TEST 4: App State Persistence (Kill & Reopen simulation)
        // ──────────────────────────────────────────────────────────────────────────
        updateResult('App Persistence', { status: 'running' });
        const t4Start = Date.now();
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;

            // Write test session state
            const testSession = { id: 'test-session-persist', duration: 1500, taskId: 'task-123', startedAt: Date.now() };
            await AsyncStorage.setItem('__test_session_persist__', JSON.stringify(testSession));

            // Read it back (simulates reopening)
            const raw = await AsyncStorage.getItem('__test_session_persist__');
            const parsed = JSON.parse(raw);
            const ok = parsed?.id === testSession.id && parsed?.duration === testSession.duration;

            await AsyncStorage.removeItem('__test_session_persist__');

            updateResult('App Persistence', {
                status: ok ? 'passed' : 'failed',
                detail: ok ? 'Session state persisted and recovered correctly' : 'State mismatch on recover',
                durationMs: Date.now() - t4Start,
            });
        } catch (e: any) {
            updateResult('App Persistence', { status: 'failed', detail: e.message, durationMs: Date.now() - t4Start });
        }

        // ──────────────────────────────────────────────────────────────────────────
        // TEST 5: Sync Queue Integrity
        // ──────────────────────────────────────────────────────────────────────────
        updateResult('Sync Queue', { status: 'running' });
        const t5Start = Date.now();
        try {
            const { enqueue, getQueue, getPendingCount } = await import('../native/syncEngine');

            const testId = `queue-test-${Date.now()}`;
            await enqueue({ id: testId, action: 'create', entity: 'tasks', payload: { title: 'Test' } });
            const count = await getPendingCount();
            const queue = await getQueue();
            const found = queue.some((i) => i.id === testId);

            // Cleanup
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const cleaned = queue.filter((i) => i.id !== testId);
            await AsyncStorage.setItem('sync:queue:v1', JSON.stringify(cleaned));

            updateResult('Sync Queue', {
                status: found ? 'passed' : 'failed',
                detail: `Queue count: ${count} | Item found: ${found}`,
                durationMs: Date.now() - t5Start,
            });
        } catch (e: any) {
            updateResult('Sync Queue', { status: 'failed', detail: e.message, durationMs: Date.now() - t5Start });
        }

        setRunning(false);
    };

    const totalPassed = results.filter((r) => r.status === 'passed').length;
    const totalFailed = results.filter((r) => r.status === 'failed').length;

    return (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
            <Text style={styles.title}>🧪 Production Test Runner</Text>
            <Text style={styles.subtitle}>DEV ONLY — runs all production validation scenarios</Text>

            {/* Summary bar */}
            {results.length > 0 && (
                <View style={styles.summaryBar}>
                    <Text style={styles.summaryText}>
                        {totalPassed} ✅  {totalFailed} ❌  {results.filter((r) => r.status === 'running').length} ⏳
                    </Text>
                </View>
            )}

            {/* Run button */}
            <TouchableOpacity
                style={[styles.runBtn, running && styles.runBtnDisabled]}
                onPress={runAll}
                disabled={running}
            >
                {running
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.runBtnText}>▶ Run All Tests</Text>
                }
            </TouchableOpacity>

            {/* Results */}
            {results.map((r) => (
                <View key={r.name} style={[styles.resultCard, r.status === 'passed' ? styles.cardPass : r.status === 'failed' ? styles.cardFail : styles.cardRunning]}>
                    <View style={styles.resultHeader}>
                        <Text style={styles.resultIcon}>
                            {r.status === 'passed' ? '✅' : r.status === 'failed' ? '❌' : r.status === 'running' ? '⏳' : '○'}
                        </Text>
                        <Text style={styles.resultName}>{r.name}</Text>
                        {r.durationMs !== undefined && (
                            <Text style={styles.resultDuration}>{r.durationMs}ms</Text>
                        )}
                    </View>
                    {r.detail && <Text style={styles.resultDetail}>{r.detail}</Text>}
                </View>
            ))}

            {/* Manual tests guidance */}
            <View style={styles.manualSection}>
                <Text style={styles.manualTitle}>📋 Manual Tests Required</Text>
                {[
                    { icon: '🔐', label: 'Login', steps: 'Enter credentials → verify Dashboard loads → check Sentry user is set' },
                    { icon: '✅', label: 'Create Task', steps: 'Fill form → AI subtasks → Save → verify in TaskList' },
                    { icon: '🔥', label: 'Log Habit', steps: 'HabitGallery → press ○ → verify streak increments' },
                    { icon: '⏱️', label: 'Focus Session', steps: 'TaskDetail → Start → kill app → reopen → verify SessionComplete' },
                    { icon: '📴', label: 'Offline Flow', steps: 'Airplane mode → Create task → online → verify synced to server' },
                    { icon: '🔔', label: 'Push Tap', steps: 'Send test push via Expo → tap → verify correct screen opens' },
                ].map((t) => (
                    <View key={t.label} style={styles.manualItem}>
                        <Text style={styles.manualItemTitle}>{t.icon} {t.label}</Text>
                        <Text style={styles.manualItemSteps}>{t.steps}</Text>
                    </View>
                ))}
            </View>

            {/* Device commands */}
            <View style={styles.manualSection}>
                <Text style={styles.manualTitle}>🔗 Deep Link Device Commands</Text>
                <Text style={styles.codeBlock}>
                    {`# iOS Simulator\nxcrun simctl openurl booted "transition://tasks/abc123"\nxcrun simctl openurl booted "transition://family-connect/accept?token=xyz"\n\n# Android Emulator\nadb shell am start -W -a android.intent.action.VIEW \\\n  -d "transition://habits/hab01"`}
                </Text>
            </View>

            {/* Sentry Dry Run */}
            <TouchableOpacity
                style={styles.sentryToggleBtn}
                onPress={() => setShowSentry((v) => !v)}
            >
                <Text style={styles.sentryToggleText}>{showSentry ? '▲ Hide' : '▼ Show'} Sentry Dry Run Panel</Text>
            </TouchableOpacity>
            {showSentry && <SentryDryRun />}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing['4'], paddingBottom: 60 },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700', marginTop: Spacing['8'] },
    subtitle: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginBottom: Spacing['5'] },
    summaryBar: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing['3'], marginBottom: Spacing['3'], alignItems: 'center' },
    summaryText: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    runBtn: { backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: Spacing['4'], alignItems: 'center', marginBottom: Spacing['4'], shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
    runBtnDisabled: { opacity: 0.5 },
    runBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
    resultCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing['4'], marginBottom: Spacing['3'] },
    cardPass: { backgroundColor: Colors.success + '10', borderColor: Colors.success + '30' },
    cardFail: { backgroundColor: Colors.error + '10', borderColor: Colors.error + '30' },
    cardRunning: { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], marginBottom: 4 },
    resultIcon: { fontSize: 16 },
    resultName: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600', flex: 1 },
    resultDuration: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    resultDetail: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18, marginLeft: 24 },
    manualSection: { marginBottom: Spacing['5'] },
    manualTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700', marginBottom: Spacing['3'], textTransform: 'uppercase', letterSpacing: 0.5 },
    manualItem: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing['3'], marginBottom: Spacing['2'], borderWidth: 1, borderColor: Colors.border },
    manualItemTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600', marginBottom: 2 },
    manualItemSteps: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, lineHeight: 18 },
    codeBlock: { backgroundColor: '#0F1117', borderRadius: Radius.lg, padding: Spacing['4'], color: '#7DD3FC', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
    sentryToggleBtn: { paddingVertical: Spacing['3'], alignItems: 'center', marginBottom: Spacing['2'] },
    sentryToggleText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm, fontWeight: '600' },
});
