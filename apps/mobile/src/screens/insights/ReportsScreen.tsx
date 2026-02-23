import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetDashboardSummaryQuery, useGetWeeklyTrendsQuery } from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';

export const ReportsScreen: React.FC<InsightsScreenProps<'Reports'>> = ({ navigation }) => {
    const { data: dashboard, isLoading, refetch } = useGetDashboardSummaryQuery({ leakageDays: 7, peakDays: 30 } as any);
    const { data: trends } = useGetWeeklyTrendsQuery(undefined);

    const weeklyData = Array.isArray((trends as any)?.data) ? (trends as any).data : [];
    const weeklyTasksCompleted = weeklyData.reduce((sum: number, day: any) => sum + Number(day?.tasks || 0), 0);

    const stats = useMemo(() => ({
        totalHours: Math.round((((dashboard as any)?.focus?.totalMinutes ?? 0) / 60) * 10) / 10,
        tasksCompleted: weeklyTasksCompleted,
        avgFocus: (dashboard as any)?.focus?.avgHoursPerDay ?? 0,
        streak: (dashboard as any)?.streak ?? 0,
        leakage: (dashboard as any)?.leakage?.totalLeakageMinutes ?? 0,
    }), [dashboard, weeklyTasksCompleted]);

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

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Insights'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Reports</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

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
                    {stats.tasksCompleted > 0
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
