import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetTaskByIdQuery,
    useToggleTaskMutation,
    useDeleteTaskMutation,
    useCreateSubTaskMutation,
    useUpdateSubTaskMutation,
} from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';

const PRIORITY_COLOR: Record<string, string> = {
    high: Colors.error, medium: Colors.warning, low: Colors.success,
};

export const TaskDetailScreen: React.FC<TasksScreenProps<'TaskDetail'>> = ({ navigation, route }) => {
    const { taskId } = route.params;
    const { data: task, isLoading, refetch } = useGetTaskByIdQuery(taskId);
    const [toggleTask] = useToggleTaskMutation();
    const [deleteTask] = useDeleteTaskMutation();
    const [updateSubTask] = useUpdateSubTaskMutation();
    const [expandedSection, setExpandedSection] = useState<string | null>('subtasks');

    const t = (task as any);

    const handleDelete = () => {
        Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await deleteTask(taskId).unwrap();
                    navigation.goBack();
                },
            },
        ]);
    };

    const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
        await updateSubTask({ id: subtaskId, taskId, completed: !completed }).unwrap();
        refetch();
    };

    if (isLoading) {
        return (
            <ScreenWrapper>
                <View style={styles.loading}>
                    <ActivityIndicator color={Colors.primary} size="large" />
                </View>
            </ScreenWrapper>
        );
    }

    if (!t) {
        return (
            <ScreenWrapper>
                <View style={styles.loading}>
                    <Text style={styles.errorText}>Task not found</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const completedSubtasks = (t.subTasks ?? []).filter((s: any) => s.completed).length;
    const totalSubtasks = (t.subTasks ?? []).length;
    const subProgress = totalSubtasks > 0 ? completedSubtasks / totalSubtasks : 0;

    return (
        <ScreenWrapper scrollable>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>‹ Back</Text>
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                        <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Task Header Card */}
            <GlassCard style={styles.mainCard}>
                <View style={styles.topRow}>
                    <TouchableOpacity
                        style={[styles.checkbox, t.completed && styles.checkboxDone]}
                        onPress={() => toggleTask(taskId)}
                    >
                        {t.completed && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{t.status ?? 'pending'}</Text>
                    </View>
                </View>

                <Text style={[styles.taskTitle, t.completed && styles.strikeTitle]}>
                    {t.title}
                </Text>

                {t.description && (
                    <Text style={styles.description}>{t.description}</Text>
                )}

                {/* Meta chips */}
                <View style={styles.metaRow}>
                    {t.dueDate && (
                        <View style={styles.metaChip}>
                            <Text style={styles.metaText}>📅 {new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                    )}
                    {t.priority && (
                        <View style={[styles.metaChip, { borderColor: PRIORITY_COLOR[t.priority] + '50' }]}>
                            <View style={[styles.metaDot, { backgroundColor: PRIORITY_COLOR[t.priority] }]} />
                            <Text style={[styles.metaText, { color: PRIORITY_COLOR[t.priority] }]}>{t.priority}</Text>
                        </View>
                    )}
                    {t.category?.name && (
                        <View style={styles.metaChip}>
                            <Text style={styles.metaText}>📚 {t.category.name}</Text>
                        </View>
                    )}
                    {t.effortLevel && (
                        <View style={styles.metaChip}>
                            <Text style={styles.metaText}>⚡ Effort {t.effortLevel}/5</Text>
                        </View>
                    )}
                </View>
            </GlassCard>

            {/* Sub-tasks */}
            {totalSubtasks > 0 && (
                <GlassCard style={styles.section}>
                    <TouchableOpacity
                        style={styles.sectionHeader}
                        onPress={() => setExpandedSection(expandedSection === 'subtasks' ? null : 'subtasks')}
                    >
                        <Text style={styles.sectionTitle}>Sub-Tasks ({completedSubtasks}/{totalSubtasks})</Text>
                        <Text style={styles.chevron}>{expandedSection === 'subtasks' ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {/* Progress bar */}
                    <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${Math.round(subProgress * 100)}%` }]} />
                    </View>
                    {expandedSection === 'subtasks' && (
                        <View style={styles.subtaskList}>
                            {(t.subTasks ?? []).map((s: any) => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={styles.subtaskRow}
                                    onPress={() => handleToggleSubtask(s.id, s.completed)}
                                >
                                    <View style={[styles.subCheckbox, s.completed && styles.subCheckboxDone]}>
                                        {s.completed && <Text style={styles.subCheckmark}>✓</Text>}
                                    </View>
                                    <Text style={[styles.subtaskText, s.completed && styles.subtaskDone]}>
                                        {s.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </GlassCard>
            )}

            {/* Focus Session CTA */}
            <TouchableOpacity
                style={styles.focusBtn}
                onPress={() => navigation.navigate('FocusSession' as any)}
            >
                <Text style={styles.focusBtnText}>⏱️  Start Focus Session</Text>
            </TouchableOpacity>

            {/* Efficiency panel */}
            {(t.timeSpentMinutes || t.estimatedMinutes) && (
                <GlassCard style={styles.section}>
                    <Text style={styles.sectionTitle}>⚡ Efficiency</Text>
                    <View style={styles.effRow}>
                        <View style={styles.effItem}>
                            <Text style={styles.effValue}>{t.estimatedMinutes ?? '—'}m</Text>
                            <Text style={styles.effLabel}>Estimated</Text>
                        </View>
                        <View style={styles.effDivider} />
                        <View style={styles.effItem}>
                            <Text style={styles.effValue}>{t.timeSpentMinutes ?? 0}m</Text>
                            <Text style={styles.effLabel}>Spent</Text>
                        </View>
                        <View style={styles.effDivider} />
                        <View style={styles.effItem}>
                            <Text style={[styles.effValue, { color: (t.timeSpentMinutes ?? 0) <= (t.estimatedMinutes ?? Infinity) ? Colors.success : Colors.error }]}>
                                {t.estimatedMinutes
                                    ? `${Math.round(((t.timeSpentMinutes ?? 0) / t.estimatedMinutes) * 100)}%`
                                    : '—'}
                            </Text>
                            <Text style={styles.effLabel}>Used</Text>
                        </View>
                    </View>
                </GlassCard>
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: Colors.textMuted, fontSize: Typography.fontSize.base },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    backBtn: { paddingVertical: Spacing['2'] },
    backText: { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    headerActions: { flexDirection: 'row', gap: Spacing['2'] },
    actionBtn: { padding: Spacing['2'] },
    deleteText: { fontSize: 20 },
    mainCard: { marginBottom: Spacing['4'] },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['3'] },
    checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
    statusBadge: { backgroundColor: Colors.surface, paddingHorizontal: Spacing['3'], paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    statusText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    taskTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700', lineHeight: 28, marginBottom: Spacing['2'] },
    strikeTitle: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    description: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing['3'] },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    metaDot: { width: 6, height: 6, borderRadius: 3 },
    metaText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    section: { marginBottom: Spacing['4'] },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['3'] },
    sectionTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600' },
    chevron: { color: Colors.textMuted, fontSize: 12 },
    progressBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: Spacing['3'] },
    progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
    subtaskList: { gap: Spacing['2'] },
    subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], paddingVertical: 4 },
    subCheckbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    subCheckboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    subCheckmark: { color: '#fff', fontSize: 10, fontWeight: '700' },
    subtaskText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, flex: 1 },
    subtaskDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    focusBtn: { backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: Spacing['4'], alignItems: 'center', marginBottom: Spacing['4'], shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    focusBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '600' },
    effRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: Spacing['3'] },
    effItem: { alignItems: 'center' },
    effValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700' },
    effLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    effDivider: { width: 1, height: 40, backgroundColor: Colors.border },
});
