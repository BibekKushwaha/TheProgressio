import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    Frequency,
    useDeleteHabitMutation,
    useGetCategoriesQuery,
    useGetHabitStatsQuery,
    useGetHabitsQuery,
    useLogHabitMutation,
    useResetHabitMutation,
    useUpdateHabitMutation,
} from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';
import { toArray } from '../../utils/data';
import { HABIT_COLOR_PRESETS, isHabitDoneOnDate, normalizeHabitColor } from '../../utils/habit';

const EMOJIS = ['✨', '💪', '🏃‍♂️', '🧘‍♂️', '📚', '💧', '🥗', '🍎', '💊', '💤', '💻', '🎸', '🌱', '🎨', '🧹', '🚶‍♂️', '✅'];
export const HabitDetailScreen: React.FC<InsightsScreenProps<'HabitDetail'>> = ({ navigation, route }) => {
    const { habitId } = route.params;
    const { data: habitsData, refetch: refetchHabits } = useGetHabitsQuery(undefined);
    const { data: categoriesData } = useGetCategoriesQuery(undefined);
    const [logHabit, { isLoading: isLogging }] = useLogHabitMutation();
    const [updateHabit, { isLoading: isUpdating }] = useUpdateHabitMutation();
    const [resetHabit, { isLoading: isResetting }] = useResetHabitMutation();
    const [deleteHabit, { isLoading: isDeleting }] = useDeleteHabitMutation();

    const habits = toArray<any>(habitsData, ['habits', 'data']);
    const categories = toArray<any>(categoriesData, ['categories', 'data']);
    const h: any = habits.find((x: any) => x.id === habitId) ?? {};
    const { data: stats } = useGetHabitStatsQuery(habitId);
    const s: any = (stats as any)?.stats ?? stats ?? {};
    const habitColor = normalizeHabitColor(h?.color);
    const todayStr = new Date().toISOString().slice(0, 10);
    const doneToday = isHabitDoneOnDate(toArray<any>(h?.logs), todayStr);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [mercyDays, setMercyDays] = useState<number>(h?.mercyDaysAllowed ?? 1);
    const [name, setName] = useState<string>(h?.name ?? '');
    const [targetValue, setTargetValue] = useState<string>(String(h?.targetValue ?? 1));
    const [frequency, setFrequency] = useState<Frequency>(h?.frequency ?? Frequency.DAILY);
    const [icon, setIcon] = useState<string>(h?.icon ?? '✅');
    const [color, setColor] = useState<string>(habitColor);
    const [linkedCategoryId, setLinkedCategoryId] = useState<string>(h?.linkedCategoryId ?? 'none');

    const completionRate = Number(s?.completionRate ?? 0);
    const canSaveMercyDays = mercyDays !== Number(h?.mercyDaysAllowed ?? 1);

    const openEdit = () => {
        setName(h?.name ?? '');
        setTargetValue(String(h?.targetValue ?? 1));
        setFrequency(h?.frequency ?? Frequency.DAILY);
        setIcon(h?.icon ?? h?.emoji ?? '✅');
        setColor(normalizeHabitColor(h?.color));
        setLinkedCategoryId(h?.linkedCategoryId ?? 'none');
        setMercyDays(Number(h?.mercyDaysAllowed ?? 1));
        setIsEditOpen(true);
    };

    const handleCheckIn = async () => {
        try {
            await logHabit({ id: habitId, completedValue: 1 }).unwrap();
            refetchHabits();
        } catch (error) {
            console.error('Failed to check in habit:', error);
        }
    };

    const handleSaveMercyDays = async () => {
        try {
            await updateHabit({ id: habitId, mercyDaysAllowed: mercyDays }).unwrap();
            refetchHabits();
        } catch (error) {
            console.error('Failed to update mercy days:', error);
        }
    };

    const handleSaveEdit = async () => {
        if (!name.trim()) return;
        try {
            await updateHabit({
                id: habitId,
                name: name.trim(),
                frequency,
                targetValue: Math.max(1, Number(targetValue || 1)),
                icon,
                color,
                linkedCategoryId: linkedCategoryId === 'none' ? null : linkedCategoryId,
            }).unwrap();
            setIsEditOpen(false);
            refetchHabits();
        } catch (error) {
            console.error('Failed to update habit:', error);
        }
    };

    const handleReset = () => {
        Alert.alert('Reset progress?', "This will reset this habit's current streak.", [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reset',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await resetHabit(habitId).unwrap();
                        refetchHabits();
                    } catch (error) {
                        console.error('Failed to reset habit:', error);
                    }
                },
            },
        ]);
    };

    const handleDelete = () => {
        Alert.alert('Delete habit?', 'This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteHabit(habitId).unwrap();
                        navigation.goBack();
                    } catch (error) {
                        console.error('Failed to delete habit:', error);
                    }
                },
            },
        ]);
    };

    // Build a 30-day heatmap
    const thirtyDays = useMemo(() => {
        const today = new Date();
        const heatmapSet = new Set<string>(
            toArray<any>(s?.heatmapData).filter((entry) => Number(entry?.value ?? 0) > 0).map((entry) => String(entry.date).slice(0, 10)),
        );
        return Array.from({ length: 30 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (29 - i));
            const ds = d.toISOString().split('T')[0] ?? '';
            const doneFromStats = heatmapSet.has(ds);
            const doneFromLogs = isHabitDoneOnDate(toArray<any>(h?.logs), ds);
            const done = doneFromStats || doneFromLogs;
            return { date: ds, done, day: d.getDate() };
        });
    }, [h?.logs, s?.heatmapData]);

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Back'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={openEdit}>
                    <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.habitCard}>
                <View style={styles.habitRow}>
                    <View style={[styles.habitIcon, { backgroundColor: `${habitColor}20` }]}>
                        <Text style={styles.habitEmoji}>{h?.icon ?? h?.emoji ?? '✅'}</Text>
                    </View>
                    <View style={styles.habitInfo}>
                        <Text style={styles.habitName}>{h?.name ?? 'Habit'}</Text>
                        <Text style={styles.habitFreq}>{String(h?.frequency ?? 'daily').toLowerCase()}</Text>
                    </View>
                </View>
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.checkInButton, doneToday && styles.checkInButtonDone]}
                        onPress={handleCheckIn}
                        disabled={doneToday || isLogging}
                    >
                        {isLogging ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.checkInButtonText}>{doneToday ? '✓ Completed Today' : 'Check-in'}</Text>}
                    </TouchableOpacity>
                </View>
            </GlassCard>

            <GlassCard style={styles.mercyCard}>
                <Text style={styles.sectionTitle}>Mercy Days</Text>
                <View style={styles.mercyRow}>
                    {[0, 1, 2, 3].map((value) => (
                        <TouchableOpacity
                            key={value}
                            style={[styles.mercyChip, mercyDays === value && styles.mercyChipActive]}
                            onPress={() => setMercyDays(value)}
                        >
                            <Text style={[styles.mercyChipText, mercyDays === value && styles.mercyChipTextActive]}>{value}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.saveMercyButton, (!canSaveMercyDays || isUpdating) && styles.buttonDisabled]}
                        onPress={handleSaveMercyDays}
                        disabled={!canSaveMercyDays || isUpdating}
                    >
                        <Text style={styles.saveMercyButtonText}>{isUpdating ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                </View>
            </GlassCard>

            <View style={styles.statsGrid}>
                {[
                    { label: 'Current Streak', value: `🔥 ${s?.currentStreak ?? h?.currentStreak ?? 0}`, color: Colors.warning },
                    { label: 'Best Streak', value: `🏆 ${s?.longestStreak ?? s?.bestStreak ?? h?.longestStreak ?? 0}`, color: Colors.primary },
                    { label: 'Total Done', value: `✅ ${s?.totalCompletions ?? 0}`, color: Colors.success },
                    { label: 'Completion Rate', value: `${completionRate}%`, color: Colors.info ?? Colors.primaryLight },
                ].map((stat) => (
                    <GlassCard key={stat.label} style={styles.statCard}>
                        <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </GlassCard>
                ))}
            </View>

            <GlassCard style={styles.heatmapCard}>
                <Text style={styles.sectionTitle}>Last 30 Days</Text>
                <View style={styles.heatmapGrid}>
                    {thirtyDays.map((day, i) => (
                        <View
                            key={i}
                            style={[
                                styles.heatCell,
                                day.done ? { backgroundColor: habitColor } : {},
                            ]}
                        >
                            <Text style={styles.heatDay}>{day.day}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.heatLegend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: Colors.border }]} />
                        <Text style={styles.legendLabel}>Missed</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: habitColor }]} />
                        <Text style={styles.legendLabel}>Completed</Text>
                    </View>
                </View>
            </GlassCard>

            <GlassCard style={styles.dangerCard}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <View style={styles.dangerActions}>
                    <TouchableOpacity style={styles.secondaryAction} onPress={handleReset} disabled={isResetting}>
                        <Text style={styles.secondaryActionText}>{isResetting ? 'Resetting...' : 'Reset Progress'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteAction} onPress={handleDelete} disabled={isDeleting}>
                        <Text style={styles.deleteActionText}>{isDeleting ? 'Deleting...' : 'Delete Habit'}</Text>
                    </TouchableOpacity>
                </View>
            </GlassCard>

            <Modal visible={isEditOpen} transparent animationType="slide" onRequestClose={() => setIsEditOpen(false)}>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setIsEditOpen(false)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Edit Habit</Text>

                        <Text style={styles.inputLabel}>Habit Name</Text>
                        <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="e.g. Morning Meditation" placeholderTextColor={Colors.textMuted} />

                        <Text style={styles.inputLabel}>Choose Icon</Text>
                        <View style={styles.iconGrid}>
                            {EMOJIS.map((emoji) => (
                                <TouchableOpacity key={emoji} style={[styles.iconOption, icon === emoji && styles.iconOptionSelected]} onPress={() => setIcon(emoji)}>
                                    <Text style={styles.iconOptionText}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Theme Color</Text>
                        <View style={styles.colorRow}>
                            {HABIT_COLOR_PRESETS.map((preset) => (
                                <TouchableOpacity
                                    key={preset}
                                    style={[styles.colorDot, { backgroundColor: preset }, color === preset && styles.colorDotActive]}
                                    onPress={() => setColor(preset)}
                                />
                            ))}
                        </View>

                        <View style={styles.twoColRow}>
                            <View style={styles.twoCol}>
                                <Text style={styles.inputLabel}>Target</Text>
                                <TextInput value={targetValue} onChangeText={setTargetValue} keyboardType="number-pad" style={styles.input} placeholder="1" placeholderTextColor={Colors.textMuted} />
                            </View>
                            <View style={styles.twoCol}>
                                <Text style={styles.inputLabel}>Frequency</Text>
                                <View style={styles.freqRow}>
                                    {[Frequency.DAILY, Frequency.WEEKLY].map((f) => (
                                        <TouchableOpacity key={f} style={[styles.freqChip, frequency === f && styles.freqChipActive]} onPress={() => setFrequency(f)}>
                                            <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>{f}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
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

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.secondaryAction} onPress={() => setIsEditOpen(false)}>
                                <Text style={styles.secondaryActionText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.checkInButton, isUpdating && styles.buttonDisabled]} onPress={handleSaveEdit} disabled={isUpdating}>
                                <Text style={styles.checkInButtonText}>{isUpdating ? 'Saving...' : 'Save Changes'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { paddingTop: Spacing['4'], marginBottom: Spacing['3'], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    back: { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    editText: { color: Colors.primary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    habitCard: { marginBottom: Spacing['4'] },
    habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['4'] },
    habitIcon: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    habitEmoji: { fontSize: 28 },
    habitInfo: { flex: 1 },
    habitName: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700' },
    habitFreq: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2, textTransform: 'capitalize' },
    actionRow: { marginTop: Spacing['4'] },
    checkInButton: { backgroundColor: Colors.primary, paddingVertical: Spacing['3'], borderRadius: Radius.xl, alignItems: 'center' },
    checkInButtonDone: { backgroundColor: Colors.success },
    checkInButtonText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
    mercyCard: { marginBottom: Spacing['4'] },
    mercyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], flexWrap: 'wrap' },
    mercyChip: { width: 32, height: 32, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    mercyChipActive: { backgroundColor: Colors.warning, borderColor: Colors.warning },
    mercyChipText: { color: Colors.textSecondary, fontWeight: '700' },
    mercyChipTextActive: { color: '#fff' },
    saveMercyButton: { marginLeft: 'auto', backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing['3'], paddingVertical: Spacing['2'] },
    saveMercyButtonText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    buttonDisabled: { opacity: 0.5 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['3'], marginBottom: Spacing['4'] },
    statCard: { width: '47%', alignItems: 'center', padding: Spacing['3'] },
    statValue: { fontSize: Typography.fontSize.lg, fontWeight: '700', marginBottom: 2 },
    statLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, textAlign: 'center' },
    heatmapCard: { marginBottom: Spacing['6'] },
    sectionTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['3'] },
    heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    heatCell: { width: 28, height: 28, borderRadius: 4, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
    heatDay: { color: Colors.textMuted, fontSize: 8 },
    heatLegend: { flexDirection: 'row', gap: Spacing['4'], marginTop: Spacing['3'] },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
    legendDot: { width: 10, height: 10, borderRadius: 3 },
    legendLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    dangerCard: { marginBottom: Spacing['6'] },
    dangerActions: { gap: Spacing['2'] },
    secondaryAction: { borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing['3'], borderRadius: Radius.xl, alignItems: 'center' },
    secondaryActionText: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontWeight: '600' },
    deleteAction: { borderWidth: 1, borderColor: Colors.error, backgroundColor: `${Colors.error}20`, paddingVertical: Spacing['3'], borderRadius: Radius.xl, alignItems: 'center' },
    deleteActionText: { color: Colors.error, fontSize: Typography.fontSize.base, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: Colors.card,
        borderTopLeftRadius: Radius['2xl'],
        borderTopRightRadius: Radius['2xl'],
        padding: Spacing['5'],
        paddingBottom: 40,
    },
    modalTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700', marginBottom: Spacing['2'] },
    inputLabel: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['1'],
        marginTop: Spacing['3'],
    },
    input: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
    },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
    iconOption: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
    iconOptionSelected: { borderWidth: 1, borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
    iconOptionText: { fontSize: 18 },
    colorRow: { flexDirection: 'row', gap: Spacing['3'], marginTop: Spacing['1'] },
    colorDot: { width: 24, height: 24, borderRadius: Radius.full, opacity: 0.75 },
    colorDotActive: { borderWidth: 2, borderColor: '#fff', opacity: 1 },
    twoColRow: { flexDirection: 'row', gap: Spacing['3'] },
    twoCol: { flex: 1 },
    freqRow: { flexDirection: 'row', gap: Spacing['2'], marginTop: Spacing['1'] },
    freqChip: {
        flex: 1,
        paddingVertical: Spacing['2'],
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        backgroundColor: Colors.surface,
    },
    freqChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    freqText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    freqTextActive: { color: '#fff' },
    categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'], marginTop: Spacing['1'] },
    categoryChip: {
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    categoryChipActive: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
    categoryChipText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    categoryChipTextActive: { color: Colors.primaryLight },
    modalActions: { flexDirection: 'row', gap: Spacing['2'], marginTop: Spacing['5'] },
});
