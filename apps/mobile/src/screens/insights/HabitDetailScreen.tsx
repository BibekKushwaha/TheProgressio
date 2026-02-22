import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetHabitStatsQuery, useGetHabitsQuery } from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';

export const HabitDetailScreen: React.FC<InsightsScreenProps<'HabitDetail'>> = ({ navigation, route }) => {
    const { habitId } = route.params;
    const { data: habitsData } = useGetHabitsQuery(undefined);
    const habits: any[] = (habitsData as any)?.data ?? (habitsData as any) ?? [];
    const h: any = habits.find((x: any) => x.id === habitId) ?? {};
    const { data: stats } = useGetHabitStatsQuery(habitId);
    const s: any = stats ?? {};

    // Build a 30-day heatmap
    const today = new Date();
    const thirtyDays = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (29 - i));
        const ds = d.toISOString().split('T')[0];
        const done = (h?.logs ?? []).some((l: any) => l.date?.startsWith(ds) && l.completed);
        return { date: ds, done, day: d.getDate() };
    });

    return (
        <ScreenWrapper scrollable>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Back'}</Text>
                </TouchableOpacity>
            </View>

            {/* Habit Info */}
            <GlassCard style={styles.habitCard}>
                <View style={styles.habitRow}>
                    <View style={[styles.habitIcon, { backgroundColor: (h?.color ?? Colors.primary) + '20' }]}>
                        <Text style={styles.habitEmoji}>{h?.emoji ?? '✅'}</Text>
                    </View>
                    <View style={styles.habitInfo}>
                        <Text style={styles.habitName}>{h?.name ?? 'Habit'}</Text>
                        <Text style={styles.habitFreq}>{h?.frequency ?? 'daily'}</Text>
                    </View>
                </View>
            </GlassCard>

            {/* Stats */}
            <View style={styles.statsGrid}>
                {[
                    { label: 'Current Streak', value: `🔥 ${s?.currentStreak ?? 0}`, color: Colors.warning },
                    { label: 'Best Streak', value: `🏆 ${s?.bestStreak ?? 0}`, color: Colors.primary },
                    { label: 'Total Done', value: `✅ ${s?.totalCompletions ?? 0}`, color: Colors.success },
                    { label: 'Completion Rate', value: `${s?.completionRate ?? 0}%`, color: Colors.info ?? Colors.primaryLight },
                ].map((stat) => (
                    <GlassCard key={stat.label} style={styles.statCard}>
                        <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </GlassCard>
                ))}
            </View>

            {/* 30-day heatmap */}
            <GlassCard style={styles.heatmapCard}>
                <Text style={styles.sectionTitle}>Last 30 Days</Text>
                <View style={styles.heatmapGrid}>
                    {thirtyDays.map((day, i) => (
                        <View
                            key={i}
                            style={[
                                styles.heatCell,
                                day.done ? { backgroundColor: h?.color ?? Colors.primary } : {},
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
                        <View style={[styles.legendDot, { backgroundColor: h?.color ?? Colors.primary }]} />
                        <Text style={styles.legendLabel}>Completed</Text>
                    </View>
                </View>
            </GlassCard>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { paddingTop: Spacing['4'], marginBottom: Spacing['3'] },
    back: { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    habitCard: { marginBottom: Spacing['4'] },
    habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['4'] },
    habitIcon: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    habitEmoji: { fontSize: 28 },
    habitInfo: { flex: 1 },
    habitName: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700' },
    habitFreq: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2, textTransform: 'capitalize' },
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
});
