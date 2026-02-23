import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetProfileQuery,
    useMarkAttendanceMutation,
    useGetAttendanceHistoryQuery,
    useTriggerGeofencePingMutation,
} from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

const PLACE_TYPES = ['CAMPUS', 'LIBRARY', 'HOME', 'COACHING_CENTER'] as const;

function buildQrCode(userId?: string) {
    const suffix = String(userId ?? 'ANON').slice(-6).toUpperCase();
    const stamp = Date.now().toString(36).toUpperCase();
    return `STU-${suffix}-${stamp}`;
}

export const QRAttendanceScreen: React.FC<ProfileScreenProps<'QRAttendance'>> = ({ navigation }) => {
    const { data: profileData } = useGetProfileQuery(undefined);
    const userId = (profileData as any)?.user?.id;
    const [qrCode, setQrCode] = useState(() => buildQrCode(userId));
    const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();
    const { data, isLoading, refetch } = useGetAttendanceHistoryQuery(undefined);
    const [triggerPing, { isLoading: isPinging }] = useTriggerGeofencePingMutation();

    useEffect(() => {
        setQrCode(buildQrCode(userId));
    }, [userId]);

    const history = useMemo(() => {
        const list = (data as any)?.history;
        return Array.isArray(list) ? list : [];
    }, [data]);

    const attendancePercent = useMemo(() => {
        if (!history.length) return 0;
        const present = history.filter((entry: any) => entry.status === 'PRESENT' || entry.status === 'LATE').length;
        return Math.round((present / history.length) * 100);
    }, [history]);

    const handleMark = async () => {
        try {
            await markAttendance({
                qrCode,
                status: 'PRESENT',
                method: 'QR',
                location: 'Campus',
            }).unwrap();
            setQrCode(buildQrCode(userId));
            refetch();
        } catch {
            /* ignore */
        }
    };

    const handlePing = async (placeType: 'LIBRARY' | 'CAMPUS' | 'HOME' | 'COACHING_CENTER') => {
        try {
            await triggerPing({
                placeType,
                motionState: 'STATIONARY',
                brightness: 0.8,
            }).unwrap();
        } catch {
            /* ignore */
        }
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Profile'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>QR Attendance</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.topGrid}>
                <GlassCard style={styles.qrCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Student Digital ID</Text>
                        <TouchableOpacity onPress={() => setQrCode(buildQrCode(userId))}>
                            <Text style={styles.regenText}>Regenerate</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.qrBox}>
                        <Text style={styles.qrIcon}>🔳</Text>
                        <Text style={styles.qrCode}>{qrCode}</Text>
                    </View>

                    <TouchableOpacity
                        onPress={handleMark}
                        disabled={isMarking}
                        style={[styles.primaryBtn, isMarking && styles.disabled]}
                    >
                        <Text style={styles.primaryBtnText}>{isMarking ? 'Marking…' : 'Simulate QR Scan'}</Text>
                    </TouchableOpacity>
                </GlassCard>

                <GlassCard style={styles.pulseCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Geofence Pulse</Text>
                        <View style={styles.scoreBadge}>
                            <Text style={styles.scoreText}>{attendancePercent}%</Text>
                        </View>
                    </View>

                    <View style={styles.pulseGrid}>
                        {PLACE_TYPES.map((place) => (
                            <TouchableOpacity
                                key={place}
                                style={[styles.pulseBtn, isPinging && styles.disabled]}
                                onPress={() => void handlePing(place)}
                                disabled={isPinging}
                            >
                                <Text style={styles.pulseBtnText}>{place.replace('_', ' ')}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </GlassCard>
            </View>

            <Text style={styles.sectionTitle}>Attendance History</Text>
            <FlatList
                data={history}
                keyExtractor={(item: any, idx) => item.id ?? String(idx)}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading attendance…' : 'No attendance records yet.'}
                        </Text>
                    </GlassCard>
                }
                renderItem={({ item }: { item: any }) => {
                    const dateValue = item?.date ? new Date(item.date) : null;
                    return (
                        <GlassCard style={styles.historyCard}>
                            <View style={styles.historyRow}>
                                <View>
                                    <Text style={styles.historyDate}>
                                        {dateValue ? dateValue.toLocaleDateString() : 'Unknown date'}
                                    </Text>
                                    <Text style={styles.historyMeta}>
                                        {dateValue ? dateValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} • {item.method || 'MANUAL'} • {item.location || 'N/A'}
                                    </Text>
                                </View>
                                <Text
                                    style={[
                                        styles.historyStatus,
                                        item.status === 'PRESENT' && { color: Colors.success },
                                        item.status === 'LATE' && { color: Colors.warning },
                                        item.status === 'ABSENT' && { color: Colors.error },
                                    ]}
                                >
                                    {item.status || 'UNKNOWN'}
                                </Text>
                            </View>
                        </GlassCard>
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
    topGrid: { gap: Spacing['3'], marginBottom: Spacing['4'] },
    qrCard: {},
    pulseCard: {},
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing['2'] },
    cardTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    regenText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    qrBox: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.lg,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        paddingVertical: Spacing['5'],
        marginBottom: Spacing['3'],
    },
    qrIcon: { fontSize: 64, marginBottom: Spacing['2'] },
    qrCode: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700', letterSpacing: 1.2 },
    primaryBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    primaryBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    scoreBadge: {
        paddingHorizontal: Spacing['2'],
        paddingVertical: 4,
        borderRadius: Radius.full,
        backgroundColor: `${Colors.success}22`,
        borderWidth: 1,
        borderColor: `${Colors.success}55`,
    },
    scoreText: { color: Colors.success, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    pulseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
    pulseBtn: {
        width: '48%',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        paddingVertical: Spacing['3'],
        alignItems: 'center',
    },
    pulseBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    sectionTitle: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
    },
    list: { gap: Spacing['2'], paddingBottom: Spacing['8'] },
    historyCard: { marginBottom: Spacing['2'] },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyDate: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    historyMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    historyStatus: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
    disabled: { opacity: 0.5 },
});
