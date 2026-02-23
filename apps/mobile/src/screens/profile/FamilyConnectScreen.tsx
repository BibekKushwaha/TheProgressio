import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Share, Alert } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useCreateFamilyLinkMutation,
    useGetFamilyLinksQuery,
    useRevokeFamilyLinkMutation,
} from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

type FamilyLink = {
    id: string;
    label?: string | null;
    permissions: string;
    createdAt: string;
    expiresAt?: string | null;
    revokedAt?: string | null;
    lastUsedAt?: string | null;
};

const EXPIRY_OPTIONS = [7, 14, 30, 90];

export const FamilyConnectScreen: React.FC<ProfileScreenProps<'FamilyConnect'>> = ({ navigation }) => {
    const { data, isLoading, refetch } = useGetFamilyLinksQuery(undefined);
    const [createLink, { isLoading: isCreating }] = useCreateFamilyLinkMutation();
    const [revokeLink, { isLoading: isRevoking }] = useRevokeFamilyLinkMutation();
    const [label, setLabel] = useState('');
    const [permissions, setPermissions] = useState<'READ_ONLY' | 'READ_COLLABORATE'>('READ_ONLY');
    const [expiresInDays, setExpiresInDays] = useState<number>(14);

    const links = useMemo(() => {
        const list = (data as any)?.links;
        return Array.isArray(list) ? (list as FamilyLink[]) : [];
    }, [data]);

    const activeLinks = useMemo(() => links.filter((l) => !l.revokedAt), [links]);

    const handleCreate = async () => {
        try {
            const result = await createLink({
                label: label.trim() || undefined,
                permissions,
                expiresInDays,
            }).unwrap();
            setLabel('');
            const token = (result as any)?.shareToken;
            if (token) {
                const deepLink = `theprogressio://family-connect/accept?token=${token}`;
                await Share.share({
                    title: 'Family Invite',
                    message: `Family invite link:\n${deepLink}\n\nInvite token: ${token}`,
                });
            }
            refetch();
        } catch {
            Alert.alert('Create failed', 'Could not create family link.');
        }
    };

    const handleRevoke = async (id: string) => {
        Alert.alert('Revoke link?', 'This mentor/family access will be removed immediately.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Revoke',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await revokeLink(id).unwrap();
                        refetch();
                    } catch {
                        Alert.alert('Revoke failed', 'Could not revoke link.');
                    }
                },
            },
        ]);
    };

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Profile'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Family Connect</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.createCard}>
                <Text style={styles.cardTitle}>Create Share Link</Text>

                <Text style={styles.inputLabel}>Recipient Label (Optional)</Text>
                <TextInput
                    value={label}
                    onChangeText={setLabel}
                    placeholder="e.g. Mom, Dad, Mentor"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                />

                <Text style={styles.inputLabel}>Permissions</Text>
                <View style={styles.chipRow}>
                    <TouchableOpacity
                        style={[styles.chip, permissions === 'READ_ONLY' && styles.chipActive]}
                        onPress={() => setPermissions('READ_ONLY')}
                    >
                        <Text style={[styles.chipText, permissions === 'READ_ONLY' && styles.chipTextActive]}>Read Only</Text>
                    </TouchableOpacity>
                    <View style={[styles.chip, styles.chipDisabled]}>
                        <Text style={[styles.chipText, styles.chipTextDisabled]}>Collaborate (Soon)</Text>
                    </View>
                </View>

                <Text style={styles.inputLabel}>Expires In</Text>
                <View style={styles.chipRow}>
                    {EXPIRY_OPTIONS.map((days) => (
                        <TouchableOpacity
                            key={days}
                            style={[styles.chip, expiresInDays === days && styles.chipActive]}
                            onPress={() => setExpiresInDays(days)}
                        >
                            <Text style={[styles.chipText, expiresInDays === days && styles.chipTextActive]}>{days}d</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={isCreating}
                    style={[styles.createBtn, isCreating && styles.disabled]}
                >
                    <Text style={styles.createBtnText}>{isCreating ? 'Creating…' : 'Create & Share Link'}</Text>
                </TouchableOpacity>
            </GlassCard>

            <Text style={styles.sectionTitle}>Active Share Links</Text>
            <FlatList
                data={activeLinks}
                keyExtractor={(item) => item.id}
                refreshing={isLoading}
                onRefresh={refetch}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>
                            {isLoading ? 'Loading links…' : 'No active family links yet.'}
                        </Text>
                    </GlassCard>
                }
                renderItem={({ item }) => (
                    <GlassCard style={styles.linkCard}>
                        <View style={styles.linkHeader}>
                            <Text style={styles.linkLabel}>{item.label || 'Shared Progress'}</Text>
                            <Text style={styles.linkStatus}>{item.permissions.replace('_', ' ')}</Text>
                        </View>
                        <Text style={styles.linkMeta}>
                            Expires: {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'Never'}
                        </Text>
                        {item.lastUsedAt && (
                            <Text style={styles.linkMeta}>Last used: {new Date(item.lastUsedAt).toLocaleDateString()}</Text>
                        )}
                        <TouchableOpacity
                            onPress={() => void handleRevoke(item.id)}
                            disabled={isRevoking}
                            style={[styles.revokeBtn, isRevoking && styles.disabled]}
                        >
                            <Text style={styles.revokeText}>{isRevoking ? 'Revoking…' : 'Revoke link'}</Text>
                        </TouchableOpacity>
                    </GlassCard>
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
    createCard: { marginBottom: Spacing['4'] },
    cardTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700', marginBottom: Spacing['2'] },
    inputLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: Spacing['2'], marginBottom: 6 },
    input: {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: Radius.md,
        color: Colors.textPrimary,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['3'],
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'], marginBottom: Spacing['2'] },
    chip: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.full,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
    },
    chipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}22` },
    chipDisabled: { opacity: 0.5 },
    chipText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    chipTextActive: { color: Colors.primaryLight },
    chipTextDisabled: { color: Colors.textMuted },
    createBtn: {
        marginTop: Spacing['2'],
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    createBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '600' },
    sectionTitle: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
    },
    list: { gap: Spacing['2'], paddingBottom: Spacing['8'] },
    linkCard: { marginBottom: Spacing['2'] },
    linkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['1'] },
    linkLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    linkStatus: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    linkMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    revokeBtn: {
        alignSelf: 'flex-start',
        marginTop: Spacing['3'],
        backgroundColor: `${Colors.error}22`,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['1'],
    },
    revokeText: { color: Colors.error, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
    disabled: { opacity: 0.5 },
});
