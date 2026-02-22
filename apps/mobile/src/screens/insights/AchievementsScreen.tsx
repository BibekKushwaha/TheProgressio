import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetAchievementsQuery } from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';

type FilterTab = 'all' | 'earned' | 'locked';

export const AchievementsScreen: React.FC<InsightsScreenProps<'Achievements'>> = () => {
    const [tab, setTab] = useState<FilterTab>('all');
    const { data, isLoading, refetch } = useGetAchievementsQuery(undefined);
    const achievements: any[] = (data as any)?.achievements ?? data ?? [];

    const filtered = achievements.filter((a) => {
        if (tab === 'earned') return a.unlockedAt;
        if (tab === 'locked') return !a.unlockedAt;
        return true;
    });

    const earnedCount = achievements.filter((a) => a.unlockedAt).length;

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🏆 Achievements</Text>
                <View style={styles.progressBadge}>
                    <Text style={styles.progressText}>{earnedCount}/{achievements.length}</Text>
                </View>
            </View>

            {/* Progress bar */}
            <GlassCard style={styles.progressCard}>
                <Text style={styles.progressLabel}>Overall Progress</Text>
                <View style={styles.progressBg}>
                    <View style={[styles.progressFill, {
                        width: achievements.length > 0 ? `${Math.round((earnedCount / achievements.length) * 100)}%` : '0%',
                    }]} />
                </View>
                <Text style={styles.progressDesc}>
                    {earnedCount} earned · {achievements.length - earnedCount} remaining
                </Text>
            </GlassCard>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['all', 'earned', 'locked'] as FilterTab[]).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, tab === t && styles.tabActive]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Badges grid */}
            <FlatList
                data={filtered}
                keyExtractor={(item: any) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.list}
                refreshing={isLoading}
                onRefresh={refetch}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>{isLoading ? '⏳' : '🎖️'}</Text>
                        <Text style={styles.emptyText}>{isLoading ? 'Loading…' : 'No achievements yet!'}</Text>
                    </View>
                }
                renderItem={({ item }: { item: any }) => {
                    const earned = !!item.unlockedAt;
                    return (
                        <GlassCard style={earned ? styles.badgeCard : [styles.badgeCard, styles.badgeLocked]}>
                            <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                                {item.icon ?? '🏅'}
                            </Text>
                            <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
                                {item.name}
                            </Text>
                            <Text style={styles.badgeDesc} numberOfLines={2}>
                                {item.description}
                            </Text>
                            {earned && (
                                <View style={styles.earnedBadge}>
                                    <Text style={styles.earnedText}>✓ Earned</Text>
                                </View>
                            )}
                        </GlassCard>
                    );
                }}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    progressBadge: { backgroundColor: Colors.primary + '20', paddingHorizontal: Spacing['3'], paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary + '40' },
    progressText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    progressCard: { marginBottom: Spacing['4'] },
    progressLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['2'] },
    progressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
    progressDesc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    tabs: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['4'] },
    tab: { flex: 1, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
    tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    tabTextActive: { color: '#fff' },
    list: { gap: Spacing['3'], paddingBottom: 80 },
    row: { gap: Spacing['3'] },
    badgeCard: { flex: 1, alignItems: 'center', padding: Spacing['4'] },
    badgeLocked: { opacity: 0.5 },
    badgeIcon: { fontSize: 36, marginBottom: Spacing['2'] },
    badgeIconLocked: { opacity: 0.5 },
    badgeName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
    badgeNameLocked: { color: Colors.textMuted },
    badgeDesc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, textAlign: 'center' },
    earnedBadge: { marginTop: Spacing['2'], backgroundColor: Colors.success + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    earnedText: { color: Colors.success, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    emptyBox: { alignItems: 'center', paddingVertical: Spacing['16'] },
    emptyIcon: { fontSize: 48, marginBottom: Spacing['3'] },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.base },
});
