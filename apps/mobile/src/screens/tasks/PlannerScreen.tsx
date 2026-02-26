import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    usePreviewRecoveryPlanMutation,
    useApplyRecoveryPlanMutation,
} from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';
import { extractTaskId, normalizeTaskStatus } from '../../utils/task';
import { TaskStatus } from '@repo/store';
import { useLocalTasks } from '../../hooks/useLocalTasks';

type RecoveryItem = {
    taskId: string;
    title: string;
    oldDueDate: string;
    newDueDate: string;
    priority: string;
};

export const PlannerScreen: React.FC<TasksScreenProps<'Planner'>> = ({ navigation }) => {
    const { tasks, isLoading, refresh } = useLocalTasks();
    const [previewPlan, { isLoading: isPreviewing }] = usePreviewRecoveryPlanMutation();
    const [applyPlan, { isLoading: isApplying }] = useApplyRecoveryPlanMutation();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [recoveryItems, setRecoveryItems] = useState<RecoveryItem[]>([]);

    const overdue = useMemo(() => {
        const now = Date.now();
        return tasks.filter((task) => {
            if (!task?.dueDate || normalizeTaskStatus(task) === TaskStatus.COMPLETED) return false;
            return new Date(task.dueDate).getTime() < now;
        });
    }, [tasks]);

    const dueToday = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return tasks.filter((task) => task?.dueDate?.startsWith?.(today) && normalizeTaskStatus(task) !== TaskStatus.COMPLETED);
    }, [tasks]);

    const generateRecoveryPlan = async () => {
        try {
            const result = await previewPlan({ anchorDate: new Date().toISOString() }).unwrap();
            const items = toArray<RecoveryItem>((result as any)?.plan?.items);
            setRecoveryItems(items);
            setSelectedIds(new Set(items.map((item) => item.taskId)));
        } catch {
            // fallback from current local overdue list
            const fallbackItems = overdue.slice(0, 20).map((task) => {
                const taskId = extractTaskId(task);
                const oldDate = task.dueDate || new Date().toISOString();
                const shifted = new Date(oldDate);
                shifted.setDate(shifted.getDate() + 3);
                return {
                    taskId: taskId ?? '',
                    title: task.title,
                    oldDueDate: oldDate,
                    newDueDate: shifted.toISOString(),
                    priority: task.priority || 'MEDIUM',
                };
            }).filter((item) => item.taskId);
            setRecoveryItems(fallbackItems);
            setSelectedIds(new Set(fallbackItems.map((item) => item.taskId)));
        }
    };

    const toggle = (taskId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const applyRecovery = async () => {
        if (selectedIds.size === 0) return;
        try {
            await applyPlan({
                taskIds: Array.from(selectedIds),
                anchorDate: new Date().toISOString(),
            }).unwrap();
            setRecoveryItems([]);
            setSelectedIds(new Set());
            refresh();
        } catch {
            /* ignore */
        }
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Tasks'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Recovery Planner</Text>
                <TouchableOpacity onPress={refresh}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.statsCard}>
                <View style={styles.statsRow}>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{overdue.length}</Text>
                        <Text style={styles.statLabel}>Overdue</Text>
                    </View>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{dueToday.length}</Text>
                        <Text style={styles.statLabel}>Due Today</Text>
                    </View>
                    <View style={styles.statPill}>
                        <Text style={styles.statValue}>{tasks.length}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                </View>

                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, isPreviewing && styles.disabled]}
                        onPress={generateRecoveryPlan}
                        disabled={isPreviewing}
                    >
                        <Text style={styles.primaryBtnText}>{isPreviewing ? 'Generating…' : 'Generate Recovery Plan'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.applyBtn, (isApplying || selectedIds.size === 0) && styles.disabled]}
                        onPress={applyRecovery}
                        disabled={isApplying || selectedIds.size === 0}
                    >
                        <Text style={styles.applyBtnText}>
                            {isApplying ? 'Applying…' : `Apply (${selectedIds.size})`}
                        </Text>
                    </TouchableOpacity>
                </View>
            </GlassCard>

            <FlatList
                data={recoveryItems}
                keyExtractor={(item) => item.taskId}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading planner…' : 'Generate a recovery plan to rebalance overdue tasks.'}
                        </Text>
                    </GlassCard>
                }
                renderItem={({ item }) => {
                    const selected = selectedIds.has(item.taskId);
                    return (
                        <TouchableOpacity activeOpacity={0.85} onPress={() => toggle(item.taskId)}>
                            <GlassCard style={[styles.itemCard, selected && styles.itemSelected]}>
                                <View style={styles.itemRow}>
                                    <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                                        {selected && <Text style={styles.check}>✓</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                                        <Text style={styles.itemMeta}>
                                            {new Date(item.oldDueDate).toLocaleDateString()} → {new Date(item.newDueDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    );
                }}
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
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    refresh: { color: Colors.textSecondary, fontSize: Typography.fontSize.lg },
    statsCard: { marginBottom: Spacing['4'] },
    statsRow: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['3'] },
    statPill: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['2'],
    },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    statLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    actionsRow: { flexDirection: 'row', gap: Spacing['2'] },
    primaryBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    primaryBtnText: { color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '700' },
    applyBtn: {
        backgroundColor: `${Colors.success}33`,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing['3'],
    },
    applyBtnText: { color: Colors.success, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    list: { gap: Spacing['2'], paddingBottom: Spacing['8'] },
    itemCard: { marginBottom: Spacing['2'] },
    itemSelected: { borderColor: `${Colors.primary}66` },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    check: { color: '#fff', fontSize: 12, fontWeight: '700' },
    itemTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    itemMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
    disabled: { opacity: 0.5 },
});
