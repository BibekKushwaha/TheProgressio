import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetDashboardSummaryQuery,
    useGetTasksQuery,
    useGetActiveLiveSessionQuery,
    useAppSelector,
    selectCurrentUser,
    selectStreak,
    TaskStatus,
    useGetHabitsQuery,
} from '@repo/store';
import type { HomeScreenProps } from '../../navigation/types';
import { toArray } from '../../utils/data';
import { extractTaskId } from '../../utils/task';

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning ☀️';
    if (h < 17) return 'Good afternoon 👋';
    return 'Good evening 🌙';
}

export const DashboardScreen: React.FC<HomeScreenProps<'Dashboard'>> = ({ navigation }) => {
    const user = useAppSelector(selectCurrentUser);
    const firstName = (user as any)?.name?.split(' ')[0] ?? (user as any)?.username?.split(' ')[0] ?? 'Scholar';
    const { data: summary, isLoading: summaryLoading } = useGetDashboardSummaryQuery(undefined);
    const { data: tasks } = useGetTasksQuery({ status: TaskStatus.PENDING, limit: 5 } as any);
    const { data: liveSession } = useGetActiveLiveSessionQuery(undefined);
    const { data: habitsData } = useGetHabitsQuery(undefined);
    const streak = useAppSelector((state: any) => selectStreak(state) ?? state.analytics?.streak ?? 0);

    const greeting = useMemo(() => getGreeting(), []);

    const habits = useMemo(
        () => ((habitsData as any)?.habits ?? (habitsData as any)?.data ?? []) as any[],
        [habitsData]
    );
    const todayLogged = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return habits.filter((h: any) =>
            h.logs?.some((l: any) => l.date?.startsWith(todayStr) && l.completed)
        ).length;
    }, [habits]);

    const taskList: any[] = useMemo(() => toArray<any>(tasks, ['data', 'tasks']), [tasks]);

    const QUICK_ACTIONS = [
        { icon: '➕', label: 'New Task', onPress: () => (navigation as any).navigate('TasksTab', { screen: 'CreateTask' }) },
        { icon: '⏱️', label: 'Start Focus', onPress: () => (navigation as any).navigate('MenuTab') },
        { icon: '✅', label: 'Log Habit', onPress: () => (navigation as any).navigate('InsightsTab', { screen: 'HabitGallery' }) },
        { icon: '📊', label: 'Analytics', onPress: () => (navigation as any).navigate('InsightsTab', { screen: 'AnalyticsOverview' }) },
    ];

    return (
        <ScreenWrapper scrollable>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{greeting}</Text>
                    <Text style={styles.appTitle}>{firstName}</Text>
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
                <TouchableOpacity
                    onPress={() => (navigation as any).navigate('MenuTab')}
                >
                    <GlassCard style={styles.liveCard}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>Focus session active — tap to return</Text>
                    </GlassCard>
                </TouchableOpacity>
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
                <GlassCard style={styles.statCard}>
                    <Text style={styles.statValue}>{todayLogged}/{habits.length}</Text>
                    <Text style={styles.statLabel}>Habits</Text>
                </GlassCard>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
                {QUICK_ACTIONS.map((action) => (
                    <TouchableOpacity key={action.label} style={styles.actionBtn} onPress={action.onPress}>
                        <Text style={styles.actionIcon}>{action.icon}</Text>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Today's Tasks */}
            <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Today's Tasks</Text>
                <TouchableOpacity onPress={() => (navigation as any).navigate('TasksTab', { screen: 'TaskList' })}>
                    <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
            </View>
            <GlassCard style={styles.taskListCard}>
                {taskList.length === 0 && (
                    <Text style={styles.emptyText}>All caught up! 🎉</Text>
                )}
                {taskList.slice(0, 5).map((task: any) => (
                    (() => {
                        const taskId = extractTaskId(task);
                        return (
                            <TouchableOpacity
                                key={taskId ?? task.title}
                                style={styles.taskRow}
                                disabled={!taskId}
                                onPress={() => taskId && (navigation as any).navigate('TasksTab', { screen: 'TaskDetail', params: { taskId } })}
                            >
                                <View style={[styles.priorityDot, {
                                    backgroundColor:
                                        task.priority === 'HIGH' || task.priority === 'high' ? Colors.error
                                            : task.priority === 'MEDIUM' || task.priority === 'medium' ? Colors.warning
                                                : Colors.success
                                }]} />
                                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                                {task.dueDate && (
                                    <Text style={styles.taskDue}>
                                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        );
                    })()
                ))}
            </GlassCard>

            {/* Today's Habits Summary */}
            {habits.length > 0 && (
                <>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>Habits</Text>
                        <TouchableOpacity onPress={() => (navigation as any).navigate('InsightsTab', { screen: 'HabitGallery' })}>
                            <Text style={styles.seeAll}>See all →</Text>
                        </TouchableOpacity>
                    </View>
                    <GlassCard style={styles.habitsCard}>
                        {habits.slice(0, 4).map((habit: any) => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const doneToday = habit.logs?.some((l: any) => l.date?.startsWith(todayStr) && l.completed);
                            return (
                                <View key={habit.id} style={styles.habitRow}>
                                    <Text style={styles.habitEmoji}>{habit.emoji ?? habit.icon ?? '✅'}</Text>
                                    <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                                    <View style={[styles.habitCheck, doneToday && styles.habitCheckDone]}>
                                        {doneToday && <Text style={styles.habitCheckText}>✓</Text>}
                                    </View>
                                </View>
                            );
                        })}
                    </GlassCard>
                </>
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingTop: Spacing['4'], marginBottom: Spacing['5'],
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
    statsRow: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['5'] },
    statCard: { flex: 1, alignItems: 'center', padding: Spacing['2'] },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    statLabel: { color: Colors.textSecondary, fontSize: 10, marginTop: 2, textAlign: 'center' },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['3'], marginTop: Spacing['2'] },
    sectionTitle: {
        color: Colors.textSecondary, fontSize: Typography.fontSize.sm,
        fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5,
    },
    seeAll: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs },
    taskListCard: { marginBottom: Spacing['5'], gap: Spacing['2'] },
    emptyText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing['4'] },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], paddingVertical: 5 },
    priorityDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    taskTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, flex: 1 },
    taskDue: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3'], marginBottom: Spacing['5'] },
    actionBtn: {
        width: '47%', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.xl, padding: Spacing['4'], alignItems: 'center', gap: Spacing['2'],
    },
    actionIcon: { fontSize: 24 },
    actionLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '500' },
    habitsCard: { marginBottom: Spacing['8'], gap: Spacing['1'] },
    habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], paddingVertical: 5 },
    habitEmoji: { fontSize: 18 },
    habitName: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.sm },
    habitCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    habitCheckDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    habitCheckText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
