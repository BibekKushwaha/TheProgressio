import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetMorningBriefingQuery, TaskStatus } from '@repo/store';
import type { HomeScreenProps } from '../../navigation/types';
import { extractTaskId } from '../../utils/task';
import { useLocalTasks } from '../../hooks/useLocalTasks';

type BriefingTask = {
    id: string;
    title: string;
    dueDate?: string | null;
    priority?: string;
};

export const MorningBriefingScreen: React.FC<HomeScreenProps<'MorningBriefing'>> = ({ navigation }) => {
    const { data, isLoading, refetch } = useGetMorningBriefingQuery(undefined);
    const { tasks: pendingTasks } = useLocalTasks({ status: TaskStatus.PENDING });

    const briefing = ((data as any)?.briefing ?? {}) as {
        dueTasks?: number;
        habitsToComplete?: number;
        upcomingExams?: Array<{ title: string; daysUntil: number }>;
        streaksAtRisk?: Array<{ name: string; currentStreak: number }>;
        conflicts?: string[];
    };

    const topTasks = useMemo(() => {
        return (pendingTasks ?? []).slice(0, 5) as any as BriefingTask[];
    }, [pendingTasks]);

    const weatherTip = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 10) return 'Start with your hardest task while your energy is high.';
        if (hour < 16) return 'Use short breaks and hydration to sustain focus.';
        return 'Close the day with revision and tomorrow planning.';
    }, []);

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Home'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Morning Briefing</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Today at a glance</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{briefing?.dueTasks ?? 0}</Text>
                        <Text style={styles.statLabel}>Tasks due</Text>
                    </View>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{briefing?.habitsToComplete ?? 0}</Text>
                        <Text style={styles.statLabel}>Habits</Text>
                    </View>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{briefing?.streaksAtRisk?.length ?? 0}</Text>
                        <Text style={styles.statLabel}>Streak risks</Text>
                    </View>
                </View>
                <Text style={styles.tip}>Tip: {weatherTip}</Text>
            </GlassCard>

            <Text style={styles.sectionTitle}>Top Tasks</Text>
            <FlatList
                data={topTasks}
                keyExtractor={(item, index) => extractTaskId(item) ?? `briefing-task-${index}`}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading briefing…' : 'No pending tasks. Great momentum.'}
                        </Text>
                    </GlassCard>
                }
                renderItem={({ item }) => {
                    const taskId = extractTaskId(item);
                    return (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={!taskId}
                            onPress={() => taskId && (navigation as any).navigate('TasksTab', { screen: 'TaskDetail', params: { taskId } })}
                        >
                            <GlassCard style={styles.taskCard}>
                                <View style={styles.taskRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
                                        <Text style={styles.taskMeta}>
                                            {item.priority ? `${item.priority}` : 'No priority'}{item.dueDate ? ` • ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.chevron}>›</Text>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    );
                }}
            />

            {Array.isArray(briefing?.upcomingExams) && briefing.upcomingExams.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Upcoming Exams</Text>
                    <GlassCard>
                        {briefing.upcomingExams.slice(0, 3).map((exam, idx) => (
                            <TouchableOpacity
                                key={`${exam.title}-${idx}`}
                                onPress={() => (navigation as any).navigate('InsightsTab', { screen: 'ExamWarRoom' })}
                                style={styles.examRow}
                            >
                                <Text style={styles.examTitle}>{exam.title}</Text>
                                <Text style={[styles.examDays, exam.daysUntil <= 3 && { color: Colors.error }]}>
                                    {exam.daysUntil}d
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </GlassCard>
                </>
            )}
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
    summaryCard: { marginBottom: Spacing['4'] },
    summaryTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700', marginBottom: Spacing['3'] },
    statsRow: { flexDirection: 'row', gap: Spacing['2'] },
    statPill: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingVertical: Spacing['2'],
        alignItems: 'center',
    },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    statLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    tip: { color: Colors.textSecondary, marginTop: Spacing['3'], fontSize: Typography.fontSize.sm },
    sectionTitle: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
        marginTop: Spacing['1'],
    },
    list: { gap: Spacing['2'], paddingBottom: Spacing['3'] },
    taskCard: { marginBottom: Spacing['2'] },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
    taskTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    taskMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    chevron: { color: Colors.textMuted, fontSize: Typography.fontSize.lg },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
    examRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing['2'] },
    examTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, flex: 1 },
    examDays: { color: Colors.warning, fontSize: Typography.fontSize.sm, fontWeight: '700' },
});
