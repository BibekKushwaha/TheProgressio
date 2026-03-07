import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetDashboardSummaryQuery, useGetWeeklyTrendsQuery } from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';
import { captureError } from '../../native/sentry';

function normalizeWeeklyTrends(trends: unknown): Array<{ day: string; hours: number; tasks: number }> {
    if (!Array.isArray((trends as { data?: unknown[] } | undefined)?.data)) {
        return [];
    }

    return ((trends as { data: Array<{ day?: string; date?: string; hours?: number; tasks?: number }> }).data).map((item) => ({
        day: item.day ?? item.date ?? 'N/A',
        hours: Number(item.hours ?? 0),
        tasks: Number(item.tasks ?? 0),
    }));
}

export const ReportsScreen: React.FC<InsightsScreenProps<'Reports'>> = ({ navigation }) => {
    const {
        data: dashboard,
        isLoading,
        refetch: refetchDashboard,
        isError: isDashboardError,
        error: dashboardError,
    } = useGetDashboardSummaryQuery({ leakageDays: 7, peakDays: 30 } as any);
    const {
        data: trends,
        refetch: refetchTrends,
        isError: isTrendsError,
        error: trendsError,
    } = useGetWeeklyTrendsQuery(undefined);

    const weeklyData = useMemo(() => normalizeWeeklyTrends(trends), [trends]);
    const weeklyTasksCompleted = weeklyData.reduce((sum: number, day: any) => sum + Number(day?.tasks || 0), 0);
    const hasWeeklyActivity = weeklyData.some((day) => day.hours > 0 || day.tasks > 0);
    const hasAnyData = Boolean(dashboard || trends);
    const hasAnyFailure = isDashboardError || isTrendsError;
    const hasFatalFailure = hasAnyFailure && !hasAnyData;

    const stats = useMemo(() => ({
        totalHours: Math.round((((dashboard as any)?.focus?.totalMinutes ?? 0) / 60) * 10) / 10,
        tasksCompleted: weeklyTasksCompleted,
        avgFocus: (dashboard as any)?.focus?.avgHoursPerDay ?? 0,
        streak: (dashboard as any)?.streak ?? 0,
        leakage: (dashboard as any)?.leakage?.totalLeakageMinutes ?? 0,
    }), [dashboard, weeklyTasksCompleted]);

    useEffect(() => {
        if (dashboardError) {
            captureError(dashboardError, { context: 'analytics.mobile.reports.summary', screen: 'ReportsScreen' });
        }

        if (trendsError) {
            captureError(trendsError, { context: 'analytics.mobile.reports.trends', screen: 'ReportsScreen' });
        }
    }, [dashboardError, trendsError]);

    const retryAll = () => {
        void refetchDashboard();
        void refetchTrends();
    };

    const shareSummary = async () => {
        const message =
            `Weekly Progress Report\n` +
            `• Total Focus: ${stats.totalHours}h\n` +
            `• Tasks Completed: ${stats.tasksCompleted}\n` +
            `• Avg Focus/Day: ${stats.avgFocus}h\n` +
            `• Streak: ${stats.streak} days\n` +
            `• Time Leakage: ${stats.leakage} min`;

        await Share.share({ title: 'Progress Report', message });
    };

    if (hasFatalFailure) {
        return (
            <ScreenWrapper scrollable>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.back}>{'< Insights'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Weekly Report</Text>
                    <TouchableOpacity onPress={retryAll}>
                        <Text style={styles.refresh}>↻</Text>
                    </TouchableOpacity>
                </View>

                <GlassCard style={styles.statusCard}>
                    <Text style={styles.statusIcon}>⚠️</Text>
                    <Text style={styles.statusTitle}>Reports are temporarily unavailable</Text>
                    <Text style={styles.statusText}>
                        We couldn’t load this week’s report snapshot. Retry once your connection or the analytics service recovers.
                    </Text>
                    <TouchableOpacity onPress={retryAll} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Retry reports</Text>
                    </TouchableOpacity>
                </GlassCard>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Insights'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Weekly Report</Text>
                <TouchableOpacity onPress={retryAll}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            {hasAnyFailure && (
                <GlassCard style={styles.warningCard}>
                    <Text style={styles.warningTitle}>Partial report data</Text>
                    <Text style={styles.warningText}>
                        Some weekly report sections are incomplete right now. Refresh to pull the missing analytics once they are available again.
                    </Text>
                    <TouchableOpacity onPress={retryAll} style={styles.warningBtn}>
                        <Text style={styles.warningBtnText}>Retry data</Text>
                    </TouchableOpacity>
                </GlassCard>
            )}

            <GlassCard style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary snapshot</Text>
                <Text style={styles.summaryText}>
                    A lightweight weekly report for quick review and sharing. Use Analytics when you want deeper breakdowns.
                </Text>
            </GlassCard>

            <View style={styles.statsGrid}>
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statValue}>{isLoading ? '—' : `${stats.totalHours}h`}</Text>
                    <Text style={styles.statLabel}>Total Focus</Text>
                </GlassCard>
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statValue}>{isLoading ? '—' : stats.tasksCompleted}</Text>
                    <Text style={styles.statLabel}>Tasks Done</Text>
                </GlassCard>
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statValue}>{isLoading ? '—' : `${stats.avgFocus}h`}</Text>
                    <Text style={styles.statLabel}>Avg / Day</Text>
                </GlassCard>
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statValue}>{isLoading ? '—' : `${stats.streak}d`}</Text>
                    <Text style={styles.statLabel}>Streak</Text>
                </GlassCard>
            </View>

            <GlassCard style={styles.insightCard}>
                <Text style={styles.sectionTitle}>Key Insights</Text>
                <Text style={styles.insightText}>
                    {hasWeeklyActivity
                        ? `You completed ${stats.tasksCompleted} tasks this week with ${stats.totalHours} focus hours.`
                        : 'Start logging focus sessions and tasks to generate richer analytics.'}
                </Text>
                <Text style={styles.insightText}>
                    Time leakage this period: {stats.leakage} minutes.
                </Text>
                <Text style={styles.insightText}>
                    {stats.streak > 0
                        ? `Consistency is strong with a ${stats.streak}-day streak.`
                        : 'No active streak yet. Complete one session today to start.'}
                </Text>
            </GlassCard>

            <TouchableOpacity style={styles.shareBtn} onPress={shareSummary}>
                <Text style={styles.shareBtnText}>Share Weekly Report</Text>
            </TouchableOpacity>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing['4'],
        marginBottom: Spacing['4'],
    },
    back: { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    refresh: { color: Colors.textSecondary, fontSize: Typography.fontSize.lg },
    statusCard: { alignItems: 'center', paddingVertical: Spacing['6'], marginBottom: Spacing['4'] },
    statusIcon: { fontSize: 28, marginBottom: Spacing['2'] },
    statusTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', marginBottom: Spacing['2'], textAlign: 'center' },
    statusText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center', marginBottom: Spacing['4'] },
    retryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'] },
    retryBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    warningCard: { marginBottom: Spacing['4'], borderWidth: 1, borderColor: `${Colors.warning}55` },
    warningTitle: { color: Colors.warning, fontSize: Typography.fontSize.sm, fontWeight: '700', marginBottom: Spacing['1'] },
    warningText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing['3'] },
    warningBtn: { alignSelf: 'flex-start', borderRadius: Radius.md, borderWidth: 1, borderColor: `${Colors.warning}99`, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'] },
    warningBtnText: { color: Colors.warning, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    summaryCard: { marginBottom: Spacing['4'] },
    summaryTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700', marginBottom: Spacing['1'] },
    summaryText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3'], marginBottom: Spacing['4'] },
    statCard: { width: '47%', alignItems: 'center', padding: Spacing['3'] },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    statLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    insightCard: { marginBottom: Spacing['4'] },
    sectionTitle: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
    },
    insightText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing['2'] },
    shareBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
        marginBottom: Spacing['8'],
    },
    shareBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
});
