import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetNudgesQuery,
    useMarkNudgeAsReadMutation,
    useMarkAllNudgesAsReadMutation,
} from '@repo/store';
import type { HomeScreenProps } from '../../navigation/types';

type NudgeItem = {
    id: string;
    title: string;
    message: string;
    priority?: string;
    isRead?: boolean;
    scheduledAt?: string;
};

export const NotificationCenterScreen: React.FC<HomeScreenProps<'NotificationCenter'>> = ({ navigation }) => {
    const { data, isLoading, refetch } = useGetNudgesQuery(undefined);
    const [markRead, { isLoading: isMarking }] = useMarkNudgeAsReadMutation();
    const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllNudgesAsReadMutation();

    const nudges = useMemo(() => {
        const list = (data as any)?.nudges;
        return Array.isArray(list) ? (list as NudgeItem[]) : [];
    }, [data]);

    const unreadCount = nudges.filter((n) => !n.isRead).length;

    const handleMarkRead = async (id: string) => {
        try {
            await markRead(id).unwrap();
        } catch {
            /* ignore */
        }
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Home'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.summary}>
                <View style={styles.summaryRow}>
                    <View>
                        <Text style={styles.summaryCount}>{unreadCount}</Text>
                        <Text style={styles.summaryLabel}>Unread</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => markAllRead()}
                        disabled={isMarkingAll || unreadCount === 0}
                        style={[styles.markAllBtn, (isMarkingAll || unreadCount === 0) && styles.disabled]}
                    >
                        <Text style={styles.markAllText}>
                            {isMarkingAll ? 'Marking…' : 'Mark all read'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </GlassCard>

            <FlatList
                data={nudges}
                keyExtractor={(item) => item.id}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading notifications…' : 'No notifications yet.'}
                        </Text>
                    </GlassCard>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            if (!item.isRead && !isMarking) {
                                void handleMarkRead(item.id);
                            }
                        }}
                    >
                        <GlassCard style={[styles.nudgeCard, !item.isRead && styles.unreadCard]}>
                            <View style={styles.nudgeHeader}>
                                <Text style={styles.nudgeTitle}>{item.title || 'Notification'}</Text>
                                <Text
                                    style={[
                                        styles.priority,
                                        item.priority === 'HIGH' && { color: Colors.error },
                                        item.priority === 'MEDIUM' && { color: Colors.warning },
                                        item.priority === 'LOW' && { color: Colors.success },
                                    ]}
                                >
                                    {item.priority || 'INFO'}
                                </Text>
                            </View>
                            <Text style={styles.nudgeBody}>{item.message}</Text>
                            <View style={styles.metaRow}>
                                <Text style={styles.timeText}>
                                    {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : 'Just now'}
                                </Text>
                                {!item.isRead && <Text style={styles.unreadBadge}>NEW</Text>}
                            </View>
                        </GlassCard>
                    </TouchableOpacity>
                )}
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
    summary: { marginBottom: Spacing['4'] },
    summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    summaryCount: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    summaryLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    markAllBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
    },
    markAllText: { color: '#fff', fontSize: Typography.fontSize.xs, fontWeight: '600' },
    disabled: { opacity: 0.5 },
    list: { gap: Spacing['2'], paddingBottom: Spacing['8'] },
    nudgeCard: { marginBottom: Spacing['2'] },
    unreadCard: { borderColor: `${Colors.primary}66` },
    nudgeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing['2'] },
    nudgeTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600', flex: 1 },
    priority: { color: Colors.info, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    nudgeBody: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: Spacing['2'] },
    metaRow: { marginTop: Spacing['3'], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timeText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    unreadBadge: {
        color: Colors.primaryLight,
        fontSize: Typography.fontSize.xs,
        fontWeight: '700',
        backgroundColor: `${Colors.primary}22`,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['2'],
        paddingVertical: 2,
    },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
});
