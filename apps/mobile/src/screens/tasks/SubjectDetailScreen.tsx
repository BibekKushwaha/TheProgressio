import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetCategoryByIdQuery, useGetTasksQuery, TaskStatus } from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';
import { toArray } from '../../utils/data';
import { extractTaskId, formatTaskStatusLabel, normalizeTaskStatus } from '../../utils/task';

export const SubjectDetailScreen: React.FC<TasksScreenProps<'SubjectDetail'>> = ({ route, navigation }) => {
    const { subjectId, subjectName } = route.params;
    const { data: category } = useGetCategoryByIdQuery(subjectId);
    const { data, isLoading, refetch } = useGetTasksQuery({ categoryId: subjectId, page: 1, limit: 100 } as any);

    const tasks = useMemo(() => toArray<any>(data, ['data', 'tasks']), [data]);
    const completed = tasks.filter((t) => normalizeTaskStatus(t) === TaskStatus.COMPLETED).length;
    const inProgress = tasks.filter((t) => normalizeTaskStatus(t) === TaskStatus.IN_PROGRESS).length;

    const openTask = (taskId: string | null) => {
        if (!taskId) {
            Alert.alert('Task unavailable', 'This task could not be opened because its ID is missing.');
            return;
        }
        navigation.navigate('TaskDetail', { taskId });
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Subjects'}</Text>
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{subjectName}</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.summary}>
                <Text style={styles.subject}>{(category as any)?.name ?? subjectName}</Text>
                <View style={styles.stats}>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{tasks.length}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{completed}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{inProgress}</Text>
                        <Text style={styles.statLabel}>In Progress</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => navigation.navigate('CreateTask', { prefillSubjectId: subjectId })}
                >
                    <Text style={styles.createBtnText}>+ Create Task</Text>
                </TouchableOpacity>
            </GlassCard>

            <FlatList
                data={tasks}
                keyExtractor={(item: any, index: number) => extractTaskId(item) ?? `subject-task-${index}`}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading subject tasks…' : 'No tasks in this subject yet.'}
                        </Text>
                    </GlassCard>
                }
                renderItem={({ item }: { item: any }) => (
                    <TouchableOpacity
                        onPress={() => openTask(extractTaskId(item))}
                        activeOpacity={0.85}
                    >
                        <GlassCard style={styles.taskCard}>
                            <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
                            <Text style={styles.taskMeta}>
                                {formatTaskStatusLabel(normalizeTaskStatus(item))}{item.dueDate ? ` • ${new Date(item.dueDate).toLocaleDateString()}` : ''}
                            </Text>
                        </GlassCard>
                    </TouchableOpacity>
                )}
            />
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
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700', flex: 1, textAlign: 'center' },
    refresh: { color: Colors.textSecondary, fontSize: Typography.fontSize.lg },
    summary: { marginBottom: Spacing['4'] },
    subject: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', marginBottom: Spacing['3'] },
    stats: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['3'] },
    statPill: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        paddingVertical: Spacing['2'],
    },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    statLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    createBtn: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.primary,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
    },
    createBtnText: { color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '600' },
    list: { gap: Spacing['2'], paddingBottom: Spacing['8'] },
    taskCard: { marginBottom: Spacing['2'] },
    taskTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    taskMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
});
