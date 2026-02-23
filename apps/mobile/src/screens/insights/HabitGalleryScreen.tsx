import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    Frequency,
    useCreateHabitMutation,
    useDeleteHabitMutation,
    useGetCategoriesQuery,
    useGetHabitsQuery,
    useGetUserXPQuery,
    useLogHabitMutation,
    useResetHabitMutation,
    useUpdateHabitMutation,
} from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';
import { toArray } from '../../utils/data';
import { HABIT_COLOR_PRESETS, isHabitDoneOnDate, normalizeHabitColor } from '../../utils/habit';

const LEVEL_THRESHOLD = [0, 500, 1500, 3500, 7500, 15000];

function getLevel(xp: number) {
    let lvl = 1;
    for (let i = 0; i < LEVEL_THRESHOLD.length; i++) {
        if (xp >= (LEVEL_THRESHOLD[i] ?? 0)) lvl = i + 1;
        else break;
    }
    return lvl;
}

function getProgress(xp: number) {
    const lvl = getLevel(xp);
    const curr = LEVEL_THRESHOLD[lvl - 1] ?? 0;
    const nextThreshold = LEVEL_THRESHOLD[lvl] ?? LEVEL_THRESHOLD[LEVEL_THRESHOLD.length - 1] ?? 15000;
    return (xp - curr) / (nextThreshold - curr);
}

export const HabitGalleryScreen: React.FC<InsightsScreenProps<'HabitGallery'>> = ({ navigation }) => {
    const { data: habitsData, isLoading, refetch } = useGetHabitsQuery(undefined);
    const { data: categoriesData } = useGetCategoriesQuery(undefined);
    const { data: xpData } = useGetUserXPQuery(undefined);
    const [logHabit] = useLogHabitMutation();
    const [createHabit, { isLoading: isCreating }] = useCreateHabitMutation();
    const [updateHabit, { isLoading: isUpdating }] = useUpdateHabitMutation();
    const [deleteHabit] = useDeleteHabitMutation();
    const [resetHabit] = useResetHabitMutation();

    const habits = toArray<any>(habitsData, ['habits', 'data']);
    const categories = toArray<any>(categoriesData, ['categories', 'data']);

    const [actionModal, setActionModal] = useState<any>(null);
    const [formModal, setFormModal] = useState(false);
    const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('✅');
    const [frequency, setFrequency] = useState<Frequency>(Frequency.DAILY);
    const [targetValue, setTargetValue] = useState('1');
    const [color, setColor] = useState(HABIT_COLOR_PRESETS[0] ?? Colors.primary);
    const [linkedCategoryId, setLinkedCategoryId] = useState<string>('none');

    const isSaving = isCreating || isUpdating;
    const xp = (xpData as any)?.totalXP ?? (xpData as any)?.xp?.xp ?? 0;
    const level = getLevel(xp);
    const progress = getProgress(xp);

    const openCreate = () => {
        setEditingHabitId(null);
        setName('');
        setIcon('✅');
        setFrequency(Frequency.DAILY);
        setTargetValue('1');
        setColor(HABIT_COLOR_PRESETS[0] ?? Colors.primary);
        setLinkedCategoryId('none');
        setFormModal(true);
    };

    const openEdit = (habit: any) => {
        setEditingHabitId(String(habit?.id ?? ''));
        setName(String(habit?.name ?? ''));
        setIcon(String(habit?.icon ?? habit?.emoji ?? '✅'));
        setFrequency((habit?.frequency as Frequency) ?? Frequency.DAILY);
        setTargetValue(String(habit?.targetValue ?? 1));
        setColor(normalizeHabitColor(habit?.color));
        setLinkedCategoryId(String(habit?.linkedCategoryId ?? 'none'));
        setFormModal(true);
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        try {
            if (editingHabitId) {
                await updateHabit({
                    id: editingHabitId,
                    name: name.trim(),
                    icon,
                    frequency,
                    targetValue: Math.max(1, Number(targetValue || 1)),
                    color,
                    linkedCategoryId: linkedCategoryId === 'none' ? null : linkedCategoryId,
                }).unwrap();
            } else {
                await createHabit({
                    name: name.trim(),
                    icon,
                    frequency,
                    targetValue: Math.max(1, Number(targetValue || 1)),
                    color,
                    linkedCategoryId: linkedCategoryId === 'none' ? null : linkedCategoryId,
                }).unwrap();
            }
            setFormModal(false);
            refetch();
        } catch (e) {
            console.error('Save habit failed', e);
        }
    };

    const handleLog = async (habitId: string) => {
        try {
            await logHabit({ id: habitId, completedValue: 1 }).unwrap();
            refetch();
        } catch (e) {
            console.error('Log habit failed', e);
        }
    };

    const handleReset = (habit: any) => {
        Alert.alert('Reset progress?', `Reset streak for "${habit?.name ?? 'habit'}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reset',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await resetHabit(String(habit?.id)).unwrap();
                        refetch();
                    } catch (e) {
                        console.error('Reset habit failed', e);
                    }
                },
            },
        ]);
    };

    const handleDelete = (habit: any) => {
        Alert.alert('Delete habit?', `Delete "${habit?.name ?? 'habit'}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteHabit(String(habit?.id)).unwrap();
                        refetch();
                    } catch (e) {
                        console.error('Delete habit failed', e);
                    }
                },
            },
        ]);
    };

    const modalTitle = useMemo(() => (editingHabitId ? 'Edit Habit' : 'New Habit'), [editingHabitId]);

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>🔥 Habit Gallery</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                    <Text style={styles.addBtnText}>＋</Text>
                </TouchableOpacity>
            </View>

            {!!xpData && (
                <GlassCard style={styles.xpCard}>
                    <View style={styles.xpRow}>
                        <View style={styles.xpBadge}>
                            <Text style={styles.xpBadgeText}>Lv.{level}</Text>
                        </View>
                        <View style={styles.xpInfo}>
                            <Text style={styles.xpTitle}>Scholar Level {level}</Text>
                            <Text style={styles.xpSubtitle}>{xp.toLocaleString()} XP total</Text>
                        </View>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>
                        {Math.round(progress * 100)}% to Level {level + 1}
                    </Text>
                </GlassCard>
            )}

            <FlatList
                data={habits}
                keyExtractor={(item: any) => String(item.id)}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={(
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>{isLoading ? '⏳' : '🌱'}</Text>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading habits…' : 'Start your first habit!'}
                        </Text>
                    </View>
                )}
                renderItem={({ item }: { item: any }) => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const doneToday = isHabitDoneOnDate(toArray<any>(item?.logs), todayStr);
                    const streak = Number(item?.currentStreak ?? item?.streak ?? 0);
                    const accent = normalizeHabitColor(item?.color);

                    return (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => navigation.navigate('HabitDetail', { habitId: String(item.id) })}
                            onLongPress={() => setActionModal(item)}
                        >
                            <GlassCard style={[styles.habitCard, doneToday && styles.habitCardDone]}>
                                <View style={styles.habitRow}>
                                    <View style={[styles.habitIcon, { backgroundColor: `${accent}20` }]}>
                                        <Text style={styles.habitEmoji}>{item?.icon ?? item?.emoji ?? '✅'}</Text>
                                    </View>

                                    <View style={styles.habitBody}>
                                        <Text style={styles.habitName}>{String(item?.name ?? 'Habit')}</Text>
                                        {streak > 0 && (
                                            <Text style={styles.streakText}>🔥 {streak} day streak</Text>
                                        )}
                                        <View style={styles.miniHeatmap}>
                                            {Array.from({ length: 7 }).map((_, i) => {
                                                const d = new Date();
                                                d.setDate(d.getDate() - (6 - i));
                                                const ds = d.toISOString().slice(0, 10);
                                                const done = isHabitDoneOnDate(toArray<any>(item?.logs), ds);
                                                return (
                                                    <View
                                                        key={i}
                                                        style={[styles.heatDot, done && { backgroundColor: accent }]}
                                                    />
                                                );
                                            })}
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => !doneToday && handleLog(String(item.id))}
                                        style={[styles.logBtn, doneToday && styles.logBtnDone]}
                                        disabled={doneToday}
                                    >
                                        <Text style={styles.logBtnText}>{doneToday ? '✓' : '○'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    );
                }}
            />

            <Modal visible={formModal} transparent animationType="slide" onRequestClose={() => setFormModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setFormModal(false)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>{modalTitle}</Text>

                        <Text style={styles.inputLabel}>Emoji</Text>
                        <TextInput
                            style={styles.input}
                            value={icon}
                            onChangeText={setIcon}
                            placeholder="✅"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.inputLabel}>Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Morning Exercise"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.inputLabel}>Frequency</Text>
                        <View style={styles.freqRow}>
                            {[Frequency.DAILY, Frequency.WEEKLY].map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.freqChip, frequency === f && styles.freqChipActive]}
                                    onPress={() => setFrequency(f)}
                                >
                                    <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Target (times per period)</Text>
                        <TextInput
                            style={styles.input}
                            value={targetValue}
                            onChangeText={setTargetValue}
                            keyboardType="number-pad"
                            placeholder="1"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.inputLabel}>Color</Text>
                        <View style={styles.colorRow}>
                            {HABIT_COLOR_PRESETS.map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                                    onPress={() => setColor(c)}
                                />
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Auto-Link Category</Text>
                        <View style={styles.categoryWrap}>
                            <TouchableOpacity style={[styles.categoryChip, linkedCategoryId === 'none' && styles.categoryChipActive]} onPress={() => setLinkedCategoryId('none')}>
                                <Text style={[styles.categoryChipText, linkedCategoryId === 'none' && styles.categoryChipTextActive]}>None</Text>
                            </TouchableOpacity>
                            {categories.map((category: any) => (
                                <TouchableOpacity
                                    key={String(category.id)}
                                    style={[styles.categoryChip, linkedCategoryId === String(category.id) && styles.categoryChipActive]}
                                    onPress={() => setLinkedCategoryId(String(category.id))}
                                >
                                    <Text style={[styles.categoryChipText, linkedCategoryId === String(category.id) && styles.categoryChipTextActive]}>{String(category.name)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.createBtn, (!name.trim() || isSaving) && styles.disabled]}
                            onPress={handleSave}
                            disabled={!name.trim() || isSaving}
                        >
                            {isSaving
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={styles.createBtnText}>{editingHabitId ? 'Save Changes' : 'Create Habit'}</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setActionModal(null)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>{String(actionModal?.name ?? 'Habit')}</Text>
                        <TouchableOpacity style={styles.modalAction} onPress={() => { const h = actionModal; setActionModal(null); openEdit(h); }}>
                            <Text style={styles.modalActionText}>✏️  Edit Habit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalAction} onPress={() => { const id = String(actionModal?.id ?? ''); setActionModal(null); if (id) navigation.navigate('HabitDetail', { habitId: id }); }}>
                            <Text style={styles.modalActionText}>📊  View Stats</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalAction} onPress={() => { const h = actionModal; setActionModal(null); handleReset(h); }}>
                            <Text style={styles.modalActionText}>🔄  Reset Progress</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalAction} onPress={() => { const h = actionModal; setActionModal(null); handleDelete(h); }}>
                            <Text style={[styles.modalActionText, { color: Colors.error }]}>🗑️  Delete</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    addBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#fff', fontSize: 22, lineHeight: 28 },
    xpCard: { marginBottom: Spacing['4'] },
    xpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], marginBottom: Spacing['3'] },
    xpBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    xpBadgeText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    xpInfo: { flex: 1 },
    xpTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600' },
    xpSubtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
    progressLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    list: { gap: Spacing['2'], paddingBottom: 80 },
    emptyBox: { alignItems: 'center', paddingVertical: Spacing['16'] },
    emptyIcon: { fontSize: 48, marginBottom: Spacing['3'] },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.base },
    habitCard: { padding: Spacing['3'] },
    habitCardDone: { borderColor: `${Colors.success}40` },
    habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
    habitIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    habitEmoji: { fontSize: 22 },
    habitBody: { flex: 1, gap: 2 },
    habitName: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600' },
    streakText: { color: Colors.warning, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    miniHeatmap: { flexDirection: 'row', gap: 3, marginTop: 4 },
    heatDot: { width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.border },
    logBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    logBtnDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    logBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing['5'], paddingBottom: 40 },
    modalTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700', marginBottom: Spacing['4'] },
    modalAction: { paddingVertical: Spacing['4'], borderBottomWidth: 1, borderBottomColor: Colors.border },
    modalActionText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base },
    inputLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['1'], marginTop: Spacing['3'] },
    input: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'] },
    freqRow: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['2'] },
    freqChip: { flex: 1, paddingVertical: Spacing['2'], borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface },
    freqChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    freqText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    freqTextActive: { color: '#fff' },
    colorRow: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['1'] },
    colorDot: { width: 22, height: 22, borderRadius: Radius.full, opacity: 0.8 },
    colorDotActive: { borderWidth: 2, borderColor: '#fff', opacity: 1 },
    categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'], marginTop: Spacing['1'] },
    categoryChip: { paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'], borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    categoryChipActive: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
    categoryChipText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    categoryChipTextActive: { color: Colors.primaryLight },
    createBtn: { backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: Spacing['3'], alignItems: 'center', marginTop: Spacing['4'] },
    createBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
    disabled: { opacity: 0.5 },
});
