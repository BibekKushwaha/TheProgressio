import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAppSelector, useAppDispatch, logout as logoutAction, useLogoutMutation } from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

export const ProfileScreen: React.FC<ProfileScreenProps<'Profile'>> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state: any) => state.auth?.user);
    const [logoutApi, { isLoading }] = useLogoutMutation();

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive', onPress: async () => {
                    try {
                        await logoutApi().unwrap();
                    } catch { /* ignore */ } finally {
                        dispatch(logoutAction());
                    }
                },
            },
        ]);
    };

    const SETTINGS_GROUPS = [
        {
            title: 'Account',
            items: [
                { label: '👨‍👩‍👧 Family Connect', icon: '', onPress: () => navigation.navigate('FamilyConnect') },
                { label: '💳 Subscription', icon: '', onPress: () => navigation.navigate('Subscription') },
                { label: '📱 QR Attendance', icon: '', onPress: () => navigation.navigate('QRAttendance') },
            ],
        },
        {
            title: 'Preferences',
            items: [
                { label: '🔔 Notification Settings', icon: '', onPress: () => { } },
                { label: '🌐 Language', icon: '', onPress: () => { } },
                { label: '🌙 Quiet Hours', icon: '', onPress: () => { } },
            ],
        },
        {
            title: 'Advanced',
            items: [
                { label: '⚙️ Advanced Settings', icon: '', onPress: () => navigation.navigate('Advanced') },
            ],
        },
    ];

    return (
        <ScreenWrapper scrollable>
            {/* User card */}
            <GlassCard style={styles.userCard}>
                <View style={styles.avatarWrap}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarLetter}>
                            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.name ?? 'Student'}</Text>
                        <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
                    </View>
                </View>
            </GlassCard>

            {/* Settings groups */}
            {SETTINGS_GROUPS.map((group) => (
                <View key={group.title} style={styles.group}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <GlassCard style={styles.groupCard}>
                        {group.items.map((item, i) => (
                            <TouchableOpacity
                                key={item.label}
                                style={[styles.settingRow, i > 0 && styles.settingRowBorder]}
                                onPress={item.onPress}
                            >
                                <Text style={styles.settingLabel}>{item.label}</Text>
                                <Text style={styles.chevron}>›</Text>
                            </TouchableOpacity>
                        ))}
                    </GlassCard>
                </View>
            ))}

            {/* Logout */}
            <TouchableOpacity
                style={[styles.logoutBtn, isLoading && { opacity: 0.6 }]}
                onPress={handleLogout}
                disabled={isLoading}
            >
                <Text style={styles.logoutText}>{isLoading ? 'Logging out…' : '🚪 Log Out'}</Text>
            </TouchableOpacity>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    userCard: { marginTop: Spacing['4'], marginBottom: Spacing['5'] },
    avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing['4'] },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: '#fff', fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    userInfo: { flex: 1 },
    userName: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    userEmail: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
    group: { marginBottom: Spacing['4'] },
    groupTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['2'] },
    groupCard: { padding: 0, overflow: 'hidden' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing['4'], paddingVertical: Spacing['4'] },
    settingRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
    settingLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.base },
    chevron: { color: Colors.textMuted, fontSize: 18 },
    logoutBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: Radius.xl, paddingVertical: Spacing['4'], alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginBottom: Spacing['8'] },
    logoutText: { color: Colors.error, fontSize: Typography.fontSize.base, fontWeight: '600' },
});
