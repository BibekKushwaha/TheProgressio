import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetDashboardSummaryQuery,
    useGetSubjectPerformanceQuery,
    useGetPeakWindowQuery,
    useGetWeeklyTrendsQuery,
    useGetTimeLeakageQuery,
    useGetHabitsQuery,
    useGetTaskMetricsQuery,
    useGetDailySummaryQuery,
} from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';
import { captureError } from '../../native/sentry';

const BAR_MAX_HEIGHT = 80;
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function normalizeWeeklyTrends(trends: unknown): Array<{ day: string; hours: number; minutes: number; tasks: number }> {
    if (!Array.isArray((trends as { data?: unknown[] } | undefined)?.data)) {
        return [];
    }

    return ((trends as { data: Array<{ day?: string; date?: string; hours?: number; minutes?: number; tasks?: number }> }).data).map((item) => ({
        day: item.day ?? item.date ?? 'N/A',
        hours: Number(item.hours ?? 0),
        minutes: Number(item.minutes ?? 0),
        tasks: Number(item.tasks ?? 0),
    }));
}

function MetricBox({ label, value, color }: { label: string; value: number | string; color: string }) {
    return (
        <View style={[metricStyles.box, { borderLeftColor: color }]}>
            <Text style={metricStyles.value}>{value}</Text>
            <Text style={metricStyles.label}>{label}</Text>
        </View>
    );
}

const metricStyles = StyleSheet.create({
    box: { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing['3'], borderLeftWidth: 3, margin: Spacing['1'] },
    value: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700' },
    label: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
});

export const AnalyticsOverviewScreen: React.FC<InsightsScreenProps<'AnalyticsOverview'>> = ({ navigation }) => {
    const { data: summary, isError: isSummaryError, error: summaryError, refetch: refetchSummary } = useGetDashboardSummaryQuery(undefined);
    const { data: dailySummary, isError: isDailySummaryError, error: dailySummaryError, refetch: refetchDailySummary } = useGetDailySummaryQuery('7');
    const { data: peakData, isError: isPeakError, error: peakError, refetch: refetchPeak } = useGetPeakWindowQuery();
    const { data: breakdown, isError: isBreakdownError, error: breakdownError, refetch: refetchBreakdown } = useGetWeeklyTrendsQuery(undefined);
    const { data: leakage, isError: isLeakageError, error: leakageError, refetch: refetchLeakage } = useGetTimeLeakageQuery(undefined);
    const { data: subjects, isError: isSubjectsError, error: subjectsError, refetch: refetchSubjects } = useGetSubjectPerformanceQuery('all' as any);
    const { data: taskMetricsData, isError: isTaskMetricsError, error: taskMetricsError, refetch: refetchTaskMetrics } = useGetTaskMetricsQuery(undefined);
    const { data: habitsData, isError: isHabitsError, error: habitsError, refetch: refetchHabits } = useGetHabitsQuery(undefined);

    const weeklyTrendData = useMemo(() => normalizeWeeklyTrends(breakdown), [breakdown]);
    const weeklyFocus: number[] = weeklyTrendData.length > 0
        ? weeklyTrendData.map((item) => item.minutes)
        : [0, 0, 0, 0, 0, 0, 0];
    const maxFocus = Math.max(...weeklyFocus, 1);

    const habits = useMemo(
        () => ((habitsData as any)?.habits ?? (habitsData as any)?.data ?? []) as any[],
        [habitsData]
    );

    const taskMetrics = useMemo(() => ({
        total: taskMetricsData?.total ?? 0,
        pending: taskMetricsData?.pending ?? 0,
        inProgress: taskMetricsData?.inProgress ?? 0,
        completed: taskMetricsData?.completed ?? 0,
        overdue: taskMetricsData?.overdue ?? 0,
        dueToday: taskMetricsData?.dueToday ?? 0,
        highPriority: taskMetricsData?.highPriority ?? 0,
        mediumPriority: taskMetricsData?.mediumPriority ?? 0,
        lowPriority: taskMetricsData?.lowPriority ?? 0,
    }), [taskMetricsData]);

    const habitMetrics = useMemo(() => {
        const total = habits.length;
        const active = habits.filter((h: any) => h.streakStatus === 'active').length;
        const broken = habits.filter((h: any) => h.streakStatus === 'broken').length;
        const atRisk = habits.filter((h: any) => h.streakHealth === 'at_risk').length;
        const daily = habits.filter((h: any) => h.frequency === 'DAILY').length;
        const weekly = habits.filter((h: any) => h.frequency === 'WEEKLY').length;
        const totalStreak = habits.reduce((s: number, h: any) => s + (h.currentStreak || 0), 0);
        const avgStreak = total > 0 ? Number((totalStreak / total).toFixed(1)) : 0;
        const longestStreak = habits.reduce((m: number, h: any) => Math.max(m, h.longestStreak || 0), 0);
        return { total, active, broken, atRisk, daily, weekly, avgStreak, longestStreak };
    }, [habits]);

    const focusScore = (summary as any)?.focus?.score ?? (summary as any)?.focusScore ?? 0;
    const totalWeeklyHours = Math.round(weeklyFocus.reduce((a, b) => a + b, 0) / 60);
    const hasPrimaryData = Boolean(summary || breakdown || taskMetricsData || habitsData || subjects || leakage || peakData || dailySummary);
    const hasAnyFailure = isSummaryError || isDailySummaryError || isPeakError || isBreakdownError || isLeakageError || isSubjectsError || isTaskMetricsError || isHabitsError;
    const hasFatalFailure = hasAnyFailure && !hasPrimaryData;

    useEffect(() => {
        const failures = [
            ['analytics.mobile.dashboardSummary', summaryError],
            ['analytics.mobile.dailySummary', dailySummaryError],
            ['analytics.mobile.peakWindow', peakError],
            ['analytics.mobile.weeklyTrends', breakdownError],
            ['analytics.mobile.timeLeakage', leakageError],
            ['analytics.mobile.subjectPerformance', subjectsError],
            ['analytics.mobile.taskMetrics', taskMetricsError],
            ['analytics.mobile.habits', habitsError],
        ] as const;

        failures.forEach(([context, error]) => {
            if (error) {
                captureError(error, { context, screen: 'AnalyticsOverviewScreen' });
            }
        });
    }, [summaryError, dailySummaryError, peakError, breakdownError, leakageError, subjectsError, taskMetricsError, habitsError]);

    const retryAll = () => {
        void refetchSummary();
        void refetchDailySummary();
        void refetchPeak();
        void refetchBreakdown();
        void refetchLeakage();
        void refetchSubjects();
        void refetchTaskMetrics();
        void refetchHabits();
    };

    if (hasFatalFailure) {
        return (
            <ScreenWrapper scrollable>
                <View style={styles.header}>
                    <Text style={styles.title}>📊 Analytics</Text>
                </View>
                <GlassCard style={styles.statusCard}>
                    <Text style={styles.statusIcon}>⚠️</Text>
                    <Text style={styles.statusTitle}>Analytics are temporarily unavailable</Text>
                    <Text style={styles.statusText}>
                        We couldn’t load your insight data right now. Pull again once the connection or backend recovers.
                    </Text>
                    <TouchableOpacity onPress={retryAll} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Retry analytics</Text>
                    </TouchableOpacity>
                </GlassCard>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <Text style={styles.title}>📊 Analytics</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('StrategicAnalytics')}
                    style={styles.stratBtn}
                >
                    <Text style={styles.stratText}>Strategic →</Text>
                </TouchableOpacity>
            </View>

            {hasAnyFailure && (
                <GlassCard style={styles.warningCard}>
                    <Text style={styles.warningTitle}>Partial data</Text>
                    <Text style={styles.warningText}>
                        Some analytics panels are using partial data right now. Totals may be incomplete until the next successful refresh.
                    </Text>
                    <TouchableOpacity onPress={retryAll} style={styles.warningBtn}>
                        <Text style={styles.warningBtnText}>Retry data</Text>
                    </TouchableOpacity>
                </GlassCard>
            )}

            {/* Top Stat Cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                {[
                    { icon: '🎯', label: 'Focus Score', value: `${Math.round(focusScore)}/100` },
                    { icon: '⏱️', label: 'Hours This Week', value: `${totalWeeklyHours}h` },
                    { icon: '✅', label: 'Tasks Done', value: (summary as any)?.tasksCompletedThisWeek ?? taskMetrics.completed },
                    { icon: '🔥', label: 'Active Habits', value: habitMetrics.active },
                    { icon: '📅', label: 'Due Today', value: taskMetrics.dueToday },
                    { icon: '⚠️', label: 'Overdue', value: taskMetrics.overdue },
                ].map((s) => (
                    <GlassCard key={s.label} style={styles.statCard}>
                        <Text style={styles.statIcon}>{s.icon}</Text>
                        <Text style={styles.statValue}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </GlassCard>
                ))}
            </ScrollView>

            {/* Weekly focus bar chart */}
            <GlassCard style={styles.chartCard}>
                <Text style={styles.chartTitle}>Focus This Week</Text>
                <View style={styles.barChart}>
                    {weeklyFocus.map((mins, i) => {
                        const height = Math.max(4, (mins / maxFocus) * BAR_MAX_HEIGHT);
                        const today = new Date().getDay();
                        const isToday = i === (today === 0 ? 6 : today - 1);
                        return (
                            <View key={i} style={styles.barCol}>
                                <Text style={styles.barValue}>{mins >= 60 ? `${Math.round(mins / 60)}h` : mins > 0 ? `${mins}m` : ''}</Text>
                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, { height, backgroundColor: isToday ? Colors.primary : Colors.primaryLight + '60' }]} />
                                </View>
                                <Text style={[styles.barDay, isToday && { color: Colors.primaryLight, fontWeight: '700' }]}>{DAYS[i]}</Text>
                            </View>
                        );
                    })}
                </View>
            </GlassCard>

            {/* Task Analytics */}
            <GlassCard style={styles.sectionCard}>
                <Text style={styles.chartTitle}>📋 Task Analytics</Text>
                <View style={styles.metricsGrid}>
                    <MetricBox label="Total" value={taskMetrics.total} color="#6B7280" />
                    <MetricBox label="Completed" value={taskMetrics.completed} color="#34D399" />
                    <MetricBox label="In Progress" value={taskMetrics.inProgress} color="#22D3EE" />
                    <MetricBox label="Pending" value={taskMetrics.pending} color="#FBBF24" />
                    <MetricBox label="Overdue" value={taskMetrics.overdue} color="#F87171" />
                    <MetricBox label="Due Today" value={taskMetrics.dueToday} color="#A78BFA" />
                    <MetricBox label="High Priority" value={taskMetrics.highPriority} color={Colors.error} />
                    <MetricBox label="Medium Priority" value={taskMetrics.mediumPriority} color={Colors.warning} />
                    <MetricBox label="Low Priority" value={taskMetrics.lowPriority} color={Colors.success} />
                </View>
            </GlassCard>

            {/* Habit Analytics */}
            <GlassCard style={styles.sectionCard}>
                <Text style={styles.chartTitle}>🔥 Habit Analytics</Text>
                <View style={styles.metricsGrid}>
                    <MetricBox label="Total Habits" value={habitMetrics.total} color="#fff" />
                    <MetricBox label="Active Streaks" value={habitMetrics.active} color="#34D399" />
                    <MetricBox label="Broken Streaks" value={habitMetrics.broken} color="#F87171" />
                    <MetricBox label="At Risk" value={habitMetrics.atRisk} color="#FBBF24" />
                    <MetricBox label="Daily" value={habitMetrics.daily} color="#22D3EE" />
                    <MetricBox label="Weekly" value={habitMetrics.weekly} color="#A78BFA" />
                    <MetricBox label="Avg Streak" value={habitMetrics.avgStreak} color="#38BDF8" />
                    <MetricBox label="Longest Streak" value={habitMetrics.longestStreak} color="#E879F9" />
                </View>
            </GlassCard>

            {/* Peak Productivity */}
            {peakData && (
                <GlassCard style={styles.sectionCard}>
                    <Text style={styles.chartTitle}>⚡ Peak Productivity</Text>
                    <Text style={styles.peakDesc}>
                        Your most productive time is <Text style={styles.peakHighlight}>{(peakData as any).peakHour ?? 'morning'}</Text> with an average focus score of <Text style={styles.peakHighlight}>{(peakData as any).avgScore ?? '—'}%</Text>.
                    </Text>
                    {((peakData as any).insights ?? []).slice(0, 2).map((tip: string, i: number) => (
                        <View key={i} style={styles.tipRow}>
                            <View style={styles.tipDot} />
                            <Text style={styles.tipText}>{tip}</Text>
                        </View>
                    ))}
                </GlassCard>
            )}

            {/* Subject Performance */}
            {subjects && ((subjects as any).subjects ?? []).length > 0 && (
                <GlassCard style={styles.sectionCard}>
                    <Text style={styles.chartTitle}>📚 Subject Performance</Text>
                    {((subjects as any).subjects ?? []).slice(0, 5).map((s: any) => (
                        <View key={s.name} style={styles.subjectRow}>
                            <Text style={styles.subjectName} numberOfLines={1}>{s.name}</Text>
                            <View style={styles.subjectBarBg}>
                                <View style={[styles.subjectBarFill, {
                                    width: `${s.score ?? 0}%`,
                                    backgroundColor: s.score > 70 ? Colors.success : s.score > 50 ? Colors.warning : Colors.error
                                }]} />
                            </View>
                            <Text style={styles.subjectScore}>{s.score ?? 0}%</Text>
                        </View>
                    ))}
                </GlassCard>
            )}

            {/* Time Leakage */}
            {leakage && (
                <GlassCard style={styles.sectionCard}>
                    <Text style={styles.chartTitle}>🕳️ Time Leakage</Text>
                    <Text style={styles.leakValue}>{(leakage as any).totalLeakageMinutes ?? 0} min/week</Text>
                    <Text style={styles.peakDesc}>{(leakage as any).insight ?? 'Your time tracking is looking great!'}</Text>
                </GlassCard>
            )}

            {/* Navigation to sub-screens */}
            <View style={styles.navGrid}>
                {[
                    { label: '🏆 Exam War Room', screen: 'ExamWarRoom' as const },
                    { label: '🎓 GPA Calculator', screen: 'GPACalculator' as const },
                    { label: '🥇 Achievements', screen: 'Achievements' as const },
                    { label: '📄 Weekly Report', screen: 'Reports' as const },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.label}
                        style={styles.navCard}
                        onPress={() => navigation.navigate(item.screen)}
                    >
                        <Text style={styles.navCardText}>{item.label}</Text>
                        <Text style={styles.navCardChevron}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    stratBtn: { paddingHorizontal: Spacing['3'], paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    stratText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm },
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
    statsScroll: { gap: Spacing['3'], paddingBottom: Spacing['4'], paddingRight: Spacing['4'] },
    statCard: { width: 110, alignItems: 'center', padding: Spacing['3'] },
    statIcon: { fontSize: 20, marginBottom: 2 },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    statLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: 2 },
    chartCard: { marginBottom: Spacing['4'] },
    sectionCard: { marginBottom: Spacing['4'] },
    chartTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600', marginBottom: Spacing['4'] },
    barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: BAR_MAX_HEIGHT + 40 },
    barCol: { flex: 1, alignItems: 'center', gap: 4 },
    barValue: { color: Colors.textMuted, fontSize: 9 },
    barBg: { width: 20, height: BAR_MAX_HEIGHT, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.surface },
    barFill: { width: '100%', borderRadius: 4 },
    barDay: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -Spacing['1'] },
    peakDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing['3'] },
    peakHighlight: { color: Colors.primaryLight, fontWeight: '700' },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['2'], marginBottom: Spacing['1'] },
    tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 5, flexShrink: 0 },
    tipText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, flex: 1 },
    subjectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], marginBottom: Spacing['2'] },
    subjectName: { width: 80, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
    subjectBarBg: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
    subjectBarFill: { height: '100%', borderRadius: 4 },
    subjectScore: { width: 34, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, textAlign: 'right' },
    leakValue: { color: Colors.error, fontSize: Typography.fontSize['2xl'], fontWeight: '700', marginBottom: 4 },
    navGrid: { gap: Spacing['3'], marginBottom: Spacing['8'] },
    navCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['4'] },
    navCardText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '500' },
    navCardChevron: { color: Colors.textMuted, fontSize: 20 },
});
