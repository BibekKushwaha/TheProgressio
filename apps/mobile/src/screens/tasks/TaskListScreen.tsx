import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { ApiErrorFallback } from '../../components/ApiErrorFallback';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetTasksQuery,
    useToggleTaskMutation,
} from '@repo/store';
import { useDebounce, FLATLIST_PERF_PROPS } from '../../utils/performance';
import type { TasksScreenProps } from '../../navigation/types';

import { TaskStatus } from '@repo/store';

type StatusFilter = 'all' | TaskStatus;

const PRIORITY_COLOR: Record<string, string> = {
    HIGH: Colors.error, high: Colors.error,
    MEDIUM: Colors.warning, medium: Colors.warning,
    LOW: Colors.success, low: Colors.success,
};

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: '🔵 Todo', value: TaskStatus.PENDING },
    { label: '🟡 In Progress', value: TaskStatus.IN_PROGRESS },
    { label: '✅ Done', value: TaskStatus.COMPLETED },
];

export const TaskListScreen: React.FC<TasksScreenProps<'TaskList'>> = ({ navigation }) => {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchRaw, setSearchRaw] = useState('');
    const search = useDebounce(searchRaw, 250);  // Only filter after 250ms idle

    const queryArg = statusFilter === 'all' ? {} : { status: statusFilter };
    const { data, isLoading, isError, error, refetch } = useGetTasksQuery(queryArg as any);
    const [toggleTask] = useToggleTaskMutation();

    // Memoize filtered list — recomputes only when data or search changes
    const tasks = useMemo(
        () => ((data as any)?.data ?? (data ?? [])).filter((t: any) =>
            t.title?.toLowerCase().includes(search.toLowerCase())
        ),
        [data, search]
    );

    // Stable renderItem reference — never re-creates unless navigation changes
    const renderItem = useCallback(({ item }: { item: any }) => (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
        >
            <GlassCard style={styles.taskCard}>
                <View style={styles.taskRow}>
                    <TouchableOpacity
                        onPress={() => toggleTask(item.id)}
                        style={item.completed ? [styles.checkbox, styles.checkboxDone] : styles.checkbox}
                    >
                        {item.completed && <Text style={styles.checkmark}>{'✓'}</Text>}
                    </TouchableOpacity>

                    <View style={styles.taskBody}>
                        <Text
                            style={item.completed ? [styles.taskTitle, styles.taskTitleDone] : styles.taskTitle}
                            numberOfLines={2}
                        >
                            {item.title}
                        </Text>
                        <View style={styles.taskMeta}>
                            {item.dueDate && (
                                <View style={styles.metaChip}>
                                    <Text style={styles.metaText}>
                                        {'📅 '}{new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </Text>
                                </View>
                            )}
                            {item.priority && (
                                <View style={[styles.metaChip, { borderColor: PRIORITY_COLOR[item.priority] + '50' }]}>
                                    <View style={[styles.metaDot, { backgroundColor: PRIORITY_COLOR[item.priority] }]} />
                                    <Text style={[styles.metaText, { color: PRIORITY_COLOR[item.priority] }]}>
                                        {item.priority}
                                    </Text>
                                </View>
                            )}
                            {item.subject?.name && (
                                <View style={styles.metaChip}>
                                    <Text style={styles.metaText}>{'📚 '}{item.subject.name}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <Text style={styles.chevron}>{'›'}</Text>
                </View>
            </GlassCard>
        </TouchableOpacity>
    ), [navigation, toggleTask]);

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Task Board</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('CreateTask')}
                >
                    <Text style={styles.addBtnText}>＋</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="🔍  Search tasks…"
                    placeholderTextColor={Colors.textMuted}
                    value={searchRaw}
                    onChangeText={setSearchRaw}
                />
            </View>

            {/* Status filter chips */}
            <View style={styles.chipsRow}>
                {STATUS_CHIPS.map((chip) => (
                    <TouchableOpacity
                        key={chip.value}
                        onPress={() => setStatusFilter(chip.value)}
                        style={[
                            styles.chip,
                            statusFilter === chip.value && styles.chipActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                statusFilter === chip.value && styles.chipTextActive,
                            ]}
                        >
                            {chip.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Task list */}
            <FlatList
                data={tasks}
                keyExtractor={(item: any) => item.id}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>{isLoading ? '⏳' : '🎉'}</Text>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading tasks…' : 'No tasks here. Add one!'}
                        </Text>
                    </View>
                }
                renderItem={({ item }: { item: any }) => (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                    >
                        <GlassCard style={styles.taskCard}>
                            <View style={styles.taskRow}>
                                {/* Completion toggle */}
                                <TouchableOpacity
                                    onPress={() => toggleTask(item.id)}
                                    style={[
                                        styles.checkbox,
                                        item.completed && styles.checkboxDone,
                                    ]}
                                >
                                    {item.completed && <Text style={styles.checkmark}>✓</Text>}
                                </TouchableOpacity>

                                <View style={styles.taskBody}>
                                    <Text
                                        style={[styles.taskTitle, item.completed && styles.taskTitleDone]}
                                        numberOfLines={2}
                                    >
                                        {item.title}
                                    </Text>
                                    <View style={styles.taskMeta}>
                                        {item.dueDate && (
                                            <View style={styles.metaChip}>
                                                <Text style={styles.metaText}>
                                                    📅 {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </Text>
                                            </View>
                                        )}
                                        {item.priority && (
                                            <View style={[styles.metaChip, { borderColor: PRIORITY_COLOR[item.priority] + '50' }]}>
                                                <View style={[styles.metaDot, { backgroundColor: PRIORITY_COLOR[item.priority] }]} />
                                                <Text style={[styles.metaText, { color: PRIORITY_COLOR[item.priority] }]}>
                                                    {item.priority}
                                                </Text>
                                            </View>
                                        )}
                                        {item.subject?.name && (
                                            <View style={styles.metaChip}>
                                                <Text style={styles.metaText}>📚 {item.subject.name}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Swipe hint chevron */}
                                <Text style={styles.chevron}>›</Text>
                            </View>
                        </GlassCard>
                    </TouchableOpacity>
                )}
            />

            {/* Floating action buttons */}
            <View style={styles.fab}>
                <TouchableOpacity
                    style={styles.fabBtn}
                    onPress={() => navigation.navigate('CreateTask')}
                >
                    <Text style={styles.fabText}>＋ New Task</Text>
                </TouchableOpacity>
            </View>
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
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    addBtn: {
        width: 36, height: 36, borderRadius: Radius.full,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    },
    addBtnText: { color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '300' },
    searchRow: { marginBottom: Spacing['3'] },
    searchInput: {
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.full, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['3'],
        color: Colors.textPrimary, fontSize: Typography.fontSize.sm,
    },
    chipsRow: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['3'], flexWrap: 'wrap' },
    chip: {
        paddingHorizontal: Spacing['3'], paddingVertical: 6,
        borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    chipTextActive: { color: '#fff' },
    list: { gap: Spacing['2'], paddingBottom: 100 },
    taskCard: { padding: Spacing['3'] },
    taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['3'] },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border,
        alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
    },
    checkboxDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkmark: { color: '#fff', fontSize: 12, fontWeight: '700' },
    taskBody: { flex: 1, gap: 4 },
    taskTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '500', lineHeight: 20 },
    taskTitleDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    taskMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['1'] },
    metaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    },
    metaDot: { width: 5, height: 5, borderRadius: 3 },
    metaText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    chevron: { color: Colors.textMuted, fontSize: 18, alignSelf: 'center' },
    emptyBox: { alignItems: 'center', paddingVertical: Spacing['16'] },
    emptyIcon: { fontSize: 48, marginBottom: Spacing['3'] },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.base },
    fab: {
        position: 'absolute', bottom: Spacing['5'], left: 0, right: 0,
        alignItems: 'center',
    },
    fabBtn: {
        backgroundColor: Colors.primary, paddingHorizontal: Spacing['6'],
        paddingVertical: Spacing['3'], borderRadius: Radius.full,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    fabText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '600' },
});
