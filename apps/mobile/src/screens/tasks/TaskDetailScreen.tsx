import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useCreateSubTaskMutation,
    useUpdateSubTaskMutation,
    useDeleteSubTaskMutation,
    useGenerateSubtasksMutation,
    TaskStatus,
    getAccessTokenSync,
    useAppSelector,
} from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';
import {
    formatTaskStatusLabel,
    getTaskSubtasks,
    normalizeTaskStatus,
    sanitizeTaskId,
} from '../../utils/task';
import { useLocalTask } from '../../hooks/useLocalTask';
import { isOnline, localTasks } from '../../native/localDbAdapter';

const PRIORITY_COLOR: Record<string, string> = {
    HIGH: Colors.error,
    MEDIUM: Colors.warning,
    LOW: Colors.success,
    high: Colors.error,
    medium: Colors.warning,
    low: Colors.success,
};

export const TaskDetailScreen: React.FC<TasksScreenProps<'TaskDetail'>> = ({ navigation, route }) => {
    const rawTaskId = (route.params as { taskId?: string } | undefined)?.taskId;
    const taskId = sanitizeTaskId(rawTaskId) ?? '';
    const hasValidTaskId = Boolean(taskId);
    const userId = useAppSelector((state: any) => state.auth?.user?.id) as string | undefined;
    const { task, isLoading, refresh } = useLocalTask(hasValidTaskId ? taskId : null);
    const [createSubTask, { isLoading: isCreatingSubTask }] = useCreateSubTaskMutation();
    const [updateSubTask] = useUpdateSubTaskMutation();
    const [deleteSubTask] = useDeleteSubTaskMutation();
    const [generateSubtasks, { isLoading: isGeneratingSubtasks }] = useGenerateSubtasksMutation();
    const [expandedSection, setExpandedSection] = useState<string | null>('subtasks');
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const t = (task as any);
    const subtasks = getTaskSubtasks(t);

    const refreshRemoteSnapshot = async () => {
        if (!hasValidTaskId || !isOnline()) return;
        const accessToken = getAccessTokenSync();
        if (!accessToken) return;
        try {
            const res = await fetch(`${process.env.EXPO_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001'}/api/tasks/${taskId}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) return;
            const body = await res.json();
            if (body && typeof body === 'object' && (body as any).id) {
                await localTasks.updateFromServerSnapshot(body as any);
            }
        } catch {
            // non-blocking
        }
    };

    const handleDelete = () => {
        Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        if (!userId) return;
                        await localTasks.delete(taskId, userId);
                        navigation.goBack();
                    } catch {
                        Alert.alert('Error', 'Failed to delete task. Please try again.');
                    }
                },
            },
        ]);
    };

    const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
        try {
            await updateSubTask({ id: subtaskId, taskId, completed: !completed }).unwrap();
            await refresh();
            await refreshRemoteSnapshot();
        } catch {
            Alert.alert('Error', 'Failed to update sub-task. Please try again.');
        }
    };

    const handleDeleteSubtask = (subtaskId: string) => {
        Alert.alert('Delete Sub-task', 'Are you sure you want to delete this sub-task?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteSubTask({ id: subtaskId, taskId }).unwrap();
                        await refresh();
                        await refreshRemoteSnapshot();
                    } catch {
                        Alert.alert('Error', 'Failed to delete sub-task. Please try again.');
                    }
                },
            },
        ]);
    };

    const handleAddSubtask = async () => {
        const title = newSubtaskTitle.trim();
        if (!title) return;
        try {
            await createSubTask({ taskId, title }).unwrap();
            setNewSubtaskTitle('');
            await refresh();
            await refreshRemoteSnapshot();
        } catch {
            Alert.alert('Error', 'Failed to create sub-task. Please try again.');
        }
    };

    const handleToggleTaskStatus = async () => {
        try {
            if (!userId) return;
            await localTasks.toggle(taskId, userId);
            await refresh();
        } catch {
            Alert.alert('Error', 'Failed to update task status. Please try again.');
        }
    };

    const handleGenerateSubtasks = async () => {
        try {
            await generateSubtasks(taskId).unwrap();
            setExpandedSection('subtasks');
            await refresh();
            await refreshRemoteSnapshot();
        } catch {
            Alert.alert('Error', 'Failed to generate AI subtasks. Please try again.');
        }
    };

    const goToTaskList = () => navigation.replace('TaskList');

    if (!hasValidTaskId) {
        return (
            <ScreenWrapper>
                <View style={styles.loading}>
                    <Text style={styles.errorText}>Invalid task link</Text>
                    <TouchableOpacity style={styles.recoverBtn} onPress={goToTaskList}>
                        <Text style={styles.recoverBtnText}>Back to Task List</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

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
                    <View style={styles.recoverRow}>
                        <TouchableOpacity style={styles.recoverBtn} onPress={() => void refresh()}>
                            <Text style={styles.recoverBtnText}>Retry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.recoverBtn} onPress={goToTaskList}>
                            <Text style={styles.recoverBtnText}>Task List</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScreenWrapper>
        );
    }

    const completedSubtasks = subtasks.filter((s) => s.completed).length;
    const totalSubtasks = subtasks.length;
    const subProgress = totalSubtasks > 0 ? completedSubtasks / totalSubtasks : 0;
    const taskStatus = normalizeTaskStatus(t);
    const isCompleted = taskStatus === TaskStatus.COMPLETED;
    const toggleStatusLabel = taskStatus === TaskStatus.PENDING
        ? 'Start Task'
        : taskStatus === TaskStatus.IN_PROGRESS
            ? 'Complete Task'
            : 'Reset Task';
    const effortLevel = t.effort ?? t.effortLevel;

    return (
        <ScreenWrapper scrollable>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>‹ Back</Text>
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('CreateTask', { taskId })}
                    >
                        <Text style={styles.editText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                        <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Task Header Card */}
            <GlassCard style={styles.mainCard}>
                <View style={styles.topRow}>
                    <TouchableOpacity
                        style={[styles.checkbox, isCompleted && styles.checkboxDone]}
                        onPress={handleToggleTaskStatus}
                    >
                        {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{formatTaskStatusLabel(taskStatus)}</Text>
                    </View>
                </View>
                <Text style={styles.statusHint}>{toggleStatusLabel}</Text>

                <Text style={[styles.taskTitle, isCompleted && styles.strikeTitle]}>
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
                    {effortLevel && (
                        <View style={styles.metaChip}>
                            <Text style={styles.metaText}>⚡ Effort {effortLevel}/5</Text>
                        </View>
                    )}
                </View>
            </GlassCard>

            {/* Sub-tasks */}
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
                    <>
                        {totalSubtasks === 0 && (
                            <Text style={styles.subtaskEmpty}>No sub-tasks yet. Add one below.</Text>
                        )}
                        <View style={styles.subtaskList}>
                            {subtasks.map((s) => (
                                <View key={s.id} style={styles.subtaskRow}>
                                    <TouchableOpacity
                                        style={styles.subtaskToggle}
                                        onPress={() => handleToggleSubtask(s.id, s.completed)}
                                    >
                                        <View style={[styles.subCheckbox, s.completed && styles.subCheckboxDone]}>
                                            {s.completed && <Text style={styles.subCheckmark}>✓</Text>}
                                        </View>
                                        <Text style={[styles.subtaskText, s.completed && styles.subtaskDone]}>
                                            {s.title}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.subtaskDeleteBtn}
                                        onPress={() => handleDeleteSubtask(s.id)}
                                    >
                                        <Text style={styles.subtaskDeleteText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                        <View style={styles.addSubtaskRow}>
                            <TextInput
                                value={newSubtaskTitle}
                                onChangeText={setNewSubtaskTitle}
                                placeholder="Add sub-task..."
                                placeholderTextColor={Colors.textMuted}
                                style={styles.addSubtaskInput}
                            />
                            <TouchableOpacity
                                style={[styles.addSubtaskBtn, (!newSubtaskTitle.trim() || isCreatingSubTask) && styles.addSubtaskBtnDisabled]}
                                onPress={handleAddSubtask}
                                disabled={!newSubtaskTitle.trim() || isCreatingSubTask}
                            >
                                <Text style={styles.addSubtaskBtnText}>{isCreatingSubTask ? '...' : 'Add'}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={[styles.aiSubtaskBtn, isGeneratingSubtasks && styles.addSubtaskBtnDisabled]}
                            onPress={handleGenerateSubtasks}
                            disabled={isGeneratingSubtasks}
                        >
                            <Text style={styles.aiSubtaskBtnText}>
                                {isGeneratingSubtasks ? 'Generating...' : '✨ AI Suggestions'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </GlassCard>

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
    recoverRow: { flexDirection: 'row', gap: Spacing['2'], marginTop: Spacing['3'] },
    recoverBtn: {
        marginTop: Spacing['3'],
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['4'],
        paddingVertical: Spacing['2'],
    },
    recoverBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    backBtn: { paddingVertical: Spacing['2'] },
    backText: { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    headerActions: { flexDirection: 'row', gap: Spacing['2'] },
    actionBtn: { padding: Spacing['2'] },
    editText: { fontSize: 20 },
    deleteText: { fontSize: 20 },
    mainCard: { marginBottom: Spacing['4'] },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['3'] },
    checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
    statusBadge: { backgroundColor: Colors.surface, paddingHorizontal: Spacing['3'], paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    statusText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    statusHint: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, marginBottom: Spacing['2'], fontWeight: '600' },
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
    subtaskEmpty: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginBottom: Spacing['2'] },
    subtaskList: { gap: Spacing['2'] },
    subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], paddingVertical: 4 },
    subtaskToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], flex: 1 },
    subCheckbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    subCheckboxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    subCheckmark: { color: '#fff', fontSize: 10, fontWeight: '700' },
    subtaskText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, flex: 1 },
    subtaskDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    subtaskDeleteBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    subtaskDeleteText: { color: Colors.textMuted, fontSize: Typography.fontSize.base, fontWeight: '700' },
    addSubtaskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], marginTop: Spacing['2'] },
    addSubtaskInput: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: 8,
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.sm,
    },
    addSubtaskBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: 8,
    },
    addSubtaskBtnDisabled: { opacity: 0.5 },
    addSubtaskBtnText: { color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' },
    aiSubtaskBtn: {
        marginTop: Spacing['2'],
        alignSelf: 'flex-start',
        backgroundColor: `${Colors.primary}22`,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: 8,
    },
    aiSubtaskBtnText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    focusBtn: { backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: Spacing['4'], alignItems: 'center', marginBottom: Spacing['4'], shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    focusBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '600' },
    effRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: Spacing['3'] },
    effItem: { alignItems: 'center' },
    effValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700' },
    effLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    effDivider: { width: 1, height: 40, backgroundColor: Colors.border },
});
