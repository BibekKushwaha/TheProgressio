import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { TaskStatus, useAppSelector } from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';
import { formatTaskStatusLabel, normalizeTaskStatus, sanitizeTaskId } from '../../utils/task';
import { useLocalTask } from '../../hooks/useLocalTask';
import { localTasks } from '../../native/localDbAdapter';

export const EventDetailScreen: React.FC<TasksScreenProps<'EventDetail'>> = ({ route, navigation }) => {
    const { eventId, eventType } = route.params;
    const isTask = eventType === 'task';
    const safeEventId = sanitizeTaskId(eventId);
    const canOpenTask = isTask && Boolean(safeEventId);
    const userId = useAppSelector((state: any) => state.auth?.user?.id) as string | undefined;
    const { task, isLoading, refresh } = useLocalTask(canOpenTask ? (safeEventId as string) : null);
    const taskStatus = normalizeTaskStatus(task);
    const toggleStatusLabel = taskStatus === TaskStatus.PENDING
        ? 'Start Task'
        : taskStatus === TaskStatus.IN_PROGRESS
            ? 'Complete Task'
            : 'Reset Task';

    const handleToggleStatus = async () => {
        if (!safeEventId) return;
        try {
            if (!userId) return;
            await localTasks.toggle(safeEventId, userId);
            await refresh();
        } catch {
            Alert.alert('Update failed', 'Could not update task status. Please try again.');
        }
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Calendar'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Event Detail</Text>
                <TouchableOpacity onPress={() => canOpenTask && refresh()}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.card}>
                <Text style={styles.type}>{eventType.toUpperCase()}</Text>
                <Text style={styles.id}>Event ID: {eventId}</Text>

                {isTask ? (
                    <>
                        <Text style={styles.eventTitle}>{isLoading ? 'Loading…' : (task as any)?.title ?? 'Task event'}</Text>
                        <Text style={styles.meta}>Status: {formatTaskStatusLabel(taskStatus)}</Text>
                        <Text style={styles.meta}>
                            Due: {(task as any)?.dueDate ? new Date((task as any).dueDate).toLocaleString() : 'Not set'}
                        </Text>
                        {(task as any)?.description && (
                            <Text style={styles.description}>{(task as any).description}</Text>
                        )}
                    </>
                ) : (
                    <Text style={styles.description}>
                        This {eventType} event is shown from your calendar schedule. Detailed editing is currently available through planner/calendar forms.
                    </Text>
                )}
            </GlassCard>

            {canOpenTask && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: safeEventId as string })}
                    >
                        <Text style={styles.actionText}>Open Task</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => (navigation as any).navigate('MenuTab', { screen: 'FocusSession', params: { taskId: safeEventId } })}
                    >
                        <Text style={styles.secondaryText}>Start Focus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => void handleToggleStatus()}
                    >
                        <Text style={styles.secondaryText}>{toggleStatusLabel}</Text>
                    </TouchableOpacity>
                </View>
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
    card: { marginBottom: Spacing['4'] },
    type: {
        alignSelf: 'flex-start',
        color: Colors.primaryLight,
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        backgroundColor: `${Colors.primary}22`,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['2'],
        paddingVertical: 2,
        marginBottom: Spacing['2'],
    },
    id: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginBottom: Spacing['3'] },
    eventTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    meta: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: Spacing['1'] },
    description: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, marginTop: Spacing['3'] },
    actions: { flexDirection: 'row', gap: Spacing['2'] },
    actionBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    actionText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    secondaryBtn: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    secondaryText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
});
