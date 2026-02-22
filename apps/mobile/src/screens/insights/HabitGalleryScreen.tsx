import React, { useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetHabitsQuery,
    useLogHabitMutation,
    useGetUserXPQuery,
} from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';

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
    const { data: habits, isLoading, refetch } = useGetHabitsQuery(undefined);
    const { data: xpData } = useGetUserXPQuery(undefined);
    const [logHabit] = useLogHabitMutation();
    const [actionModal, setActionModal] = useState<any>(null);

    const xp = (xpData as any)?.totalXP ?? 0;
    const level = getLevel(xp);
    const progress = getProgress(xp);

    const handleLog = async (habitId: string) => {
        try {
            await logHabit({ id: habitId }).unwrap();
            refetch();
        } catch (e) {
            console.error('Log habit failed', e);
        }
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🔥 Habit Gallery</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Text style={styles.addBtnText}>＋</Text>
                </TouchableOpacity>
            </View>

            {/* Level card */}
            {xpData && (
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

            {/* Habit list */}
            <FlatList
                data={(habits as any)?.data ?? (habits as any)?.habits ?? habits ?? []}
                keyExtractor={(item: any) => item.id}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>{isLoading ? '⏳' : '🌱'}</Text>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading habits…' : 'Start your first habit!'}
                        </Text>
                    </View>
                }
                renderItem={({ item }: { item: any }) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const doneToday = item.logs?.some((l: any) => l.date?.startsWith(todayStr) && l.completed);
                    return (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => navigation.navigate('HabitDetail', { habitId: item.id })}
                            onLongPress={() => setActionModal(item)}
                        >
                            <GlassCard style={[styles.habitCard, doneToday && styles.habitCardDone]}>
                                <View style={styles.habitRow}>
                                    {/* Icon */}
                                    <View style={[styles.habitIcon, { backgroundColor: (item.color ?? Colors.primary) + '20' }]}>
                                        <Text style={styles.habitEmoji}>{item.emoji ?? '✅'}</Text>
                                    </View>

                                    {/* Info */}
                                    <View style={styles.habitBody}>
                                        <Text style={styles.habitName}>{item.name}</Text>
                                        {item.streak > 0 && (
                                            <Text style={styles.streakText}>🔥 {item.streak} day streak</Text>
                                        )}
                                        {/* Mini heatmap – last 7 days */}
                                        <View style={styles.miniHeatmap}>
                                            {Array.from({ length: 7 }).map((_, i) => {
                                                const d = new Date();
                                                d.setDate(d.getDate() - (6 - i));
                                                const ds = d.toISOString().split('T')[0];
                                                const done = item.logs?.some((l: any) => l.date?.startsWith(ds) && l.completed);
                                                return (
                                                    <View
                                                        key={i}
                                                        style={[styles.heatDot, done && { backgroundColor: item.color ?? Colors.primary }]}
                                                    />
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Log button */}
                                    <TouchableOpacity
                                        onPress={() => !doneToday && handleLog(item.id)}
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

            {/* Action Modal */}
            <Modal visible={!!actionModal} transparent animationType="slide" onRequestClose={() => setActionModal(null)}>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setActionModal(null)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>{actionModal?.name}</Text>
                        {[
                            { label: '✏️  Edit Habit', onPress: () => setActionModal(null) },
                            { label: '📊  View Stats', onPress: () => { setActionModal(null); navigation.navigate('HabitDetail', { habitId: actionModal?.id }); } },
                            { label: '⏸️  Pause Habit', onPress: () => setActionModal(null) },
                            { label: '🗑️  Delete', onPress: () => setActionModal(null) },
                        ].map((a) => (
                            <TouchableOpacity key={a.label} style={styles.modalAction} onPress={a.onPress}>
                                <Text style={styles.modalActionText}>{a.label}</Text>
                            </TouchableOpacity>
                        ))}
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
    habitCardDone: { borderColor: Colors.success + '40' },
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
});
