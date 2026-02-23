import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useResolveFamilyLinkQuery } from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

export const FamilyInviteScreen: React.FC<ProfileScreenProps<'FamilyInvite'>> = ({ route, navigation }) => {
    const token = route.params.token;
    const { data, isLoading, isError, refetch } = useResolveFamilyLinkQuery(token);
    const link = (data as any)?.link;

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Profile'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Family Invite</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.card}>
                {isLoading && <Text style={styles.info}>Validating invite token…</Text>}

                {!isLoading && isError && (
                    <>
                        <Text style={styles.errorTitle}>Invalid or expired invite</Text>
                        <Text style={styles.info}>
                            This token is not valid anymore. Ask the sender to create a new invite link.
                        </Text>
                    </>
                )}

                {!isLoading && !isError && link && (
                    <>
                        <Text style={styles.successTitle}>Invite is valid</Text>
                        <Text style={styles.info}>Permissions: {link.permissions || 'READ_ONLY'}</Text>
                        <Text style={styles.info}>Link ID: {link.id}</Text>
                        <Text style={styles.info}>Owner ID: {link.userId}</Text>
                        <Text style={styles.token}>Token: {token}</Text>
                        <Text style={styles.note}>
                            This mobile build currently supports token validation and read-only access workflows.
                        </Text>
                    </>
                )}
            </GlassCard>
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
    card: { gap: Spacing['2'] },
    successTitle: { color: Colors.success, fontSize: Typography.fontSize.base, fontWeight: '700' },
    errorTitle: { color: Colors.error, fontSize: Typography.fontSize.base, fontWeight: '700' },
    info: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    token: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xs,
        fontFamily: 'monospace',
        marginTop: Spacing['2'],
    },
    note: {
        color: Colors.textMuted,
        fontSize: Typography.fontSize.xs,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        padding: Spacing['2'],
        marginTop: Spacing['2'],
    },
});
