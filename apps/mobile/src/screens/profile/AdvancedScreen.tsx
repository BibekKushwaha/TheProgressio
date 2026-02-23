import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useSyncStatus,
    usePendingSyncCount,
    useClearLocalData,
    useGetNudgeSettingsQuery,
    useUpdateNudgeSettingsMutation,
} from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

export const AdvancedScreen: React.FC<ProfileScreenProps<'Advanced'>> = ({ navigation }) => {
    const { status, pendingCount, forceSync } = useSyncStatus();
    const queueCount = usePendingSyncCount();
    const clearLocalData = useClearLocalData();
    const { data, refetch } = useGetNudgeSettingsQuery(undefined);
    const [updateSettings, { isLoading }] = useUpdateNudgeSettingsMutation();
    const [busy, setBusy] = useState(false);

    const settings = (data as any)?.settings ?? {};
    const groupedSummaries = Boolean(settings.groupedSummaries);
    const positiveTone = Boolean(settings.positiveTone);

    const updateToggle = async (key: 'groupedSummaries' | 'positiveTone', value: boolean) => {
        try {
            await updateSettings({
                [key]: value,
            }).unwrap();
            refetch();
        } catch {
            /* ignore */
        }
    };

    const handleClearCache = async () => {
        setBusy(true);
        try {
            await clearLocalData();
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Profile'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Advanced</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Sync Engine</Text>
                    <Text style={styles.meta}>Status: {status}</Text>
                    <Text style={styles.meta}>Pending (engine): {pendingCount}</Text>
                    <Text style={styles.meta}>Pending (queue): {queueCount}</Text>
                    <TouchableOpacity onPress={forceSync} style={styles.primaryBtn}>
                        <Text style={styles.primaryBtnText}>Force sync now</Text>
                    </TouchableOpacity>
                </GlassCard>

                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Notification Intelligence</Text>
                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>Grouped summaries</Text>
                            <Text style={styles.toggleHint}>Batch notifications into digest-style updates.</Text>
                        </View>
                        <Switch
                            value={groupedSummaries}
                            onValueChange={(val) => updateToggle('groupedSummaries', val)}
                            disabled={isLoading}
                        />
                    </View>

                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleLabel}>Positive tone</Text>
                            <Text style={styles.toggleHint}>Use encouraging copy in nudges and alerts.</Text>
                        </View>
                        <Switch
                            value={positiveTone}
                            onValueChange={(val) => updateToggle('positiveTone', val)}
                            disabled={isLoading}
                        />
                    </View>
                </GlassCard>

                <GlassCard style={styles.card}>
                    <Text style={styles.cardTitle}>Local Data</Text>
                    <Text style={styles.meta}>Use this when offline data gets out of sync.</Text>
                    <TouchableOpacity
                        onPress={handleClearCache}
                        disabled={busy}
                        style={[styles.dangerBtn, busy && styles.disabled]}
                    >
                        <Text style={styles.dangerBtnText}>{busy ? 'Clearing…' : 'Clear local cache'}</Text>
                    </TouchableOpacity>
                </GlassCard>
            </ScrollView>
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
    content: { gap: Spacing['3'], paddingBottom: Spacing['8'] },
    card: { gap: Spacing['2'] },
    cardTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700' },
    meta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    primaryBtn: {
        marginTop: Spacing['2'],
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        paddingVertical: Spacing['3'],
        alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '600' },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing['3'],
        backgroundColor: Colors.surface,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
    },
    toggleLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    toggleHint: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    dangerBtn: {
        marginTop: Spacing['2'],
        backgroundColor: `${Colors.error}22`,
        borderRadius: Radius.md,
        paddingVertical: Spacing['3'],
        alignItems: 'center',
    },
    dangerBtnText: { color: Colors.error, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    disabled: { opacity: 0.5 },
});
