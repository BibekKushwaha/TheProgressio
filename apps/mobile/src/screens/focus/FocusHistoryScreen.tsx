import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetAuditLogsQuery } from '@repo/store';
import type { FocusScreenProps } from '../../navigation/types';
import { toArray } from '../../utils/data';

export const FocusHistoryScreen: React.FC<FocusScreenProps<'FocusHistory'>> = ({ navigation }) => {
    const { data, isLoading, refetch } = useGetAuditLogsQuery({ limit: 50 });
    const logs = toArray<any>(data, ['logs', 'data']);

    const totalMinutes = logs.reduce((acc: number, l: any) => acc + (l.durationMinutes ?? 0), 0);
    const totalSessions = logs.length;

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>‹ Focus</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Focus History</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
                <GlassCard style={styles.sumCard}>
                    <Text style={styles.sumValue}>{totalSessions}</Text>
                    <Text style={styles.sumLabel}>Sessions</Text>
                </GlassCard>
                <GlassCard style={styles.sumCard}>
                    <Text style={styles.sumValue}>{Math.round(totalMinutes / 60)}h</Text>
                    <Text style={styles.sumLabel}>Total Focus</Text>
                </GlassCard>
                <GlassCard style={styles.sumCard}>
                    <Text style={styles.sumValue}>{totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0}m</Text>
                    <Text style={styles.sumLabel}>Avg Session</Text>
                </GlassCard>
            </View>

            <FlatList
                data={logs}
                keyExtractor={(item: any, i) => item.id ?? String(i)}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyIcon}>{isLoading ? '⏳' : '⏱️'}</Text>
                        <Text style={styles.emptyText}>{isLoading ? 'Loading…' : 'No sessions yet. Start your first focus session!'}</Text>
                    </View>
                }
                renderItem={({ item }: { item: any }) => (
                    <GlassCard style={styles.logCard}>
                        <View style={styles.logRow}>
                            <View style={styles.logLeft}>
                                <Text style={styles.logDuration}>{item.durationMinutes ?? 0}m</Text>
                                <Text style={styles.logDate}>
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date'}
                                </Text>
                            </View>
                            {item.task?.title && (
                                <View style={styles.logTaskChip}>
                                    <Text style={styles.logTaskText} numberOfLines={1}>{item.task.title}</Text>
                                </View>
                            )}
                            <Text style={styles.logXp}>+{(item.durationMinutes ?? 0) * 2} XP</Text>
                        </View>
                    </GlassCard>
                )}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    back: { color: Colors.primaryLight, fontSize: Typography.fontSize.base },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    summaryRow: { flexDirection: 'row', gap: Spacing['3'], marginBottom: Spacing['4'] },
    sumCard: { flex: 1, alignItems: 'center', padding: Spacing['3'] },
    sumValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    sumLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    list: { gap: Spacing['2'], paddingBottom: 80 },
    emptyBox: { alignItems: 'center', paddingVertical: Spacing['16'] },
    emptyIcon: { fontSize: 48, marginBottom: Spacing['3'] },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, textAlign: 'center', paddingHorizontal: Spacing['8'] },
    logCard: { padding: Spacing['3'] },
    logRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
    logLeft: { flex: 1 },
    logDuration: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    logDate: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    logTaskChip: { backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing['2'], paddingVertical: 3, maxWidth: 120 },
    logTaskText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
    logXp: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
});
