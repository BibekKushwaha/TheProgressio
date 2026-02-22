import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetDashboardSummaryQuery,
    useGetTasksQuery,
    useGetActiveLiveSessionQuery,
    useAppSelector,
    selectStreak,
    TaskStatus,
} from '@repo/store';
import type { HomeScreenProps } from '../../navigation/types';

export const DashboardScreen: React.FC<HomeScreenProps<'Dashboard'>> = ({ navigation }) => {
    const { data: summary, isLoading: summaryLoading } = useGetDashboardSummaryQuery(undefined);
    const { data: tasks } = useGetTasksQuery({ status: TaskStatus.PENDING, limit: 5 } as any);
    const { data: liveSession } = useGetActiveLiveSessionQuery(undefined);
    const streak = useAppSelector((state: any) => state.analytics?.streak ?? 0);

    return (
        <ScreenWrapper scrollable>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Good morning 👋</Text>
                    <Text style={styles.appTitle}>Command Center</Text>
                </View>
                <TouchableOpacity
                    style={styles.notifBtn}
                    onPress={() => navigation.navigate('NotificationCenter')}
                >
                    <Text style={styles.notifIcon}>🔔</Text>
                </TouchableOpacity>
            </View>

            {/* Live Session Banner */}
            {liveSession && (
                <GlassCard style={styles.liveCard}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Focus session active</Text>
                </GlassCard>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statValue}>🔥 {streak ?? 0}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                </GlassCard>
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statValue}>
                        {summaryLoading ? '—' : (summary as any)?.tasksCompletedToday ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Done Today</Text>
                </GlassCard>
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statValue}>
                        {summaryLoading ? '—' : (summary as any)?.focusMinutesToday ?? 0}m
                    </Text>
                    <Text style={styles.statLabel}>Focus Time</Text>
                </GlassCard>
            </View>

            {/* Today's Tasks */}
            <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
            <GlassCard style={styles.taskListCard}>
                {(tasks as any)?.data?.length === 0 && (
                    <Text style={styles.emptyText}>All caught up! 🎉</Text>
                )}
                {(tasks as any)?.data?.slice(0, 5).map((task: any) => (
                    <View key={task.id} style={styles.taskRow}>
                        <View style={[styles.priorityDot, { backgroundColor: task.priority === 'high' || task.priority === 'HIGH' ? Colors.error : task.priority === 'medium' || task.priority === 'MEDIUM' ? Colors.warning : Colors.success }]} />
                        <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                    </View>
                ))}
            </GlassCard>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
                {QUICK_ACTIONS.map((action) => (
                    <TouchableOpacity key={action.label} style={styles.actionBtn}>
                        <Text style={styles.actionIcon}>{action.icon}</Text>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScreenWrapper>
    );
};

const QUICK_ACTIONS = [
    { icon: '➕', label: 'New Task' },
    { icon: '⏱️', label: 'Start Focus' },
    { icon: '✅', label: 'Log Habit' },
    { icon: '📊', label: 'Analytics' },
];

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: Spacing['4'],
        marginBottom: Spacing['5'],
    },
    greeting: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    appTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    notifBtn: {
        width: 40, height: 40, borderRadius: Radius.full,
        backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    },
    notifIcon: { fontSize: 18 },
    liveCard: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: Spacing['4'], gap: Spacing['2'],
        borderColor: Colors.primary, borderWidth: 1,
    },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
    liveText: { color: Colors.success, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: Spacing['3'], marginBottom: Spacing['5'] },
    statCard: { flex: 1, alignItems: 'center', padding: Spacing['3'] },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    statLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, marginTop: 2 },
    sectionTitle: {
        color: Colors.textSecondary, fontSize: Typography.fontSize.sm,
        fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5,
        marginBottom: Spacing['3'], marginTop: Spacing['2'],
    },
    taskListCard: { marginBottom: Spacing['5'], gap: Spacing['2'] },
    emptyText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing['4'] },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], paddingVertical: 4 },
    priorityDot: { width: 8, height: 8, borderRadius: 4 },
    taskTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, flex: 1 },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3'] },
    actionBtn: {
        width: '47%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.xl, padding: Spacing['4'], alignItems: 'center', gap: Spacing['2'],
    },
    actionIcon: { fontSize: 24 },
    actionLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '500' },
});
