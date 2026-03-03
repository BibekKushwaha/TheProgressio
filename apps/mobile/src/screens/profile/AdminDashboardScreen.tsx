import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAppSelector, selectCurrentUser, selectIsAdmin } from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

export const AdminDashboardScreen: React.FC<ProfileScreenProps<'AdminDashboard'>> = ({ navigation }) => {
    const user = useAppSelector(selectCurrentUser);
    const isAdmin = useAppSelector(selectIsAdmin);

    if (!isAdmin) {
        return (
            <ScreenWrapper>
                <View style={styles.center}>
                    <Text style={styles.denied}>🚫 Access Denied</Text>
                    <Text style={styles.subText}>You do not have admin privileges.</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.backText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={styles.title}>🛡️ Admin Panel</Text>
                <Text style={styles.subtitle}>
                    Logged in as <Text style={styles.adminBadge}>ADMIN</Text>
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>

            <GlassCard style={styles.card}>
                <Text style={styles.groupTitle}>Platform</Text>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>👤 Username</Text>
                    <Text style={styles.infoValue}>{user?.username}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>🔑 Role</Text>
                    <Text style={[styles.infoValue, styles.roleAdmin]}>ADMIN</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>🆔 User ID</Text>
                    <Text style={[styles.infoValue, styles.userId]} numberOfLines={1}>{user?.id}</Text>
                </View>
            </GlassCard>

            <GlassCard style={styles.card}>
                <Text style={styles.groupTitle}>Admin Resources</Text>
                <Text style={styles.note}>
                    Revenue dashboards, transaction reconciliation, and platform analytics are accessible via the web admin panel.
                </Text>
            </GlassCard>

            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backText}>← Back to Profile</Text>
            </TouchableOpacity>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: Typography.weights.bold,
        color: Colors.text.primary,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.secondary,
    },
    adminBadge: {
        color: '#f87171',
        fontWeight: Typography.weights.semibold,
    },
    userEmail: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.tertiary,
        marginTop: 2,
    },
    card: {
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        padding: Spacing.md,
    },
    groupTitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.semibold,
        color: Colors.text.tertiary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    infoLabel: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.secondary,
    },
    infoValue: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.primary,
        fontWeight: Typography.weights.medium,
        maxWidth: '55%',
        textAlign: 'right',
    },
    roleAdmin: {
        color: '#f87171',
        fontWeight: Typography.weights.bold,
    },
    userId: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.tertiary,
    },
    note: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.secondary,
        lineHeight: 20,
    },
    backBtn: {
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: Radius.lg,
        backgroundColor: 'rgba(255,255,255,0.07)',
        alignItems: 'center',
    },
    backText: {
        color: Colors.text.primary,
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.medium,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    denied: {
        fontSize: Typography.sizes['2xl'],
        color: Colors.text.primary,
        marginBottom: Spacing.sm,
    },
    subText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.secondary,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
});
