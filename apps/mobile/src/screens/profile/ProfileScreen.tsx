import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    TextInput,
    Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    logout as logoutAction,
    useAppDispatch,
    useGetNotificationContextSignalsQuery,
    useGetNotificationIntelligenceQuery,
    useGetNudgeSettingsQuery,
    useGetProfileQuery,
    useGetWhatsAppPairingCodeQuery,
    useLogoutMutation,
    useUnpairWhatsAppMutation,
    useUpdateNudgeSettingsMutation,
    useUpdateProfileMutation,
} from '@repo/store';
import type { ProfileScreenProps } from '../../navigation/types';

const NOTIFICATION_BUCKETS = [
    { key: 'URGENCY_DRIVEN', title: 'Deadline Alerts', description: 'Urgency-driven reminders for upcoming conflicts' },
    { key: 'MORNING_BRIEFING', title: 'Morning Briefing', description: 'Top priorities and schedule context' },
    { key: 'BEHAVIORAL_NUDGE', title: 'Behavioral Nudges', description: 'Gentle check-ins for streaks and routines' },
    { key: 'ADVANCE_ALERT_3WEEK', title: 'Exam Alerts', description: '3-week, 1-week, and 3-day reminders' },
    { key: 'TRANSACTION_SYSTEM', title: 'System Updates', description: 'Attendance, sync, and confirmation updates' },
] as const;

const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
] as const;

const DEFAULT_BUCKETS = {
    URGENCY_DRIVEN: true,
    MORNING_BRIEFING: true,
    BEHAVIORAL_NUDGE: true,
    ADVANCE_ALERT_3WEEK: true,
    TRANSACTION_SYSTEM: true,
};

const getTimezonePayload = () => ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
});

export const ProfileScreen: React.FC<ProfileScreenProps<'Profile'>> = ({ navigation }) => {
    const dispatch = useAppDispatch();
    const { data: profileData, refetch: refetchProfile } = useGetProfileQuery(undefined);
    const { data: nudgeData, refetch: refetchNudges } = useGetNudgeSettingsQuery(undefined);
    const { data: intelligenceData } = useGetNotificationIntelligenceQuery(undefined);
    const { data: contextSignals } = useGetNotificationContextSignalsQuery({ locationTag: 'CAMPUS', motionState: 'WALKING', brightness: 0.7 } as any);
    const { data: pairingData, refetch: refetchPairing } = useGetWhatsAppPairingCodeQuery(undefined);

    const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();
    const [updateNudges, { isLoading: isUpdatingNudges }] = useUpdateNudgeSettingsMutation();
    const [unpairWhatsApp, { isLoading: isUnpairing }] = useUnpairWhatsAppMutation();
    const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();

    const user = (profileData as any)?.user ?? null;
    const settings = (nudgeData as any)?.settings ?? {};
    const pairingCode = (pairingData as any)?.pairingCode;
    const whatsappVerified = Boolean((pairingData as any)?.verified);
    const whatsappNumber = (pairingData as any)?.whatsappNumber;

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [dailyGoalHours, setDailyGoalHours] = useState<number>(4);
    const [quietEnabled, setQuietEnabled] = useState(false);
    const [quietStart, setQuietStart] = useState('22:00');
    const [quietEnd, setQuietEnd] = useState('07:00');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

    useEffect(() => {
        if (!user) return;
        setUsername(String(user?.username ?? ''));
        setEmail(String(user?.email ?? ''));
        setDailyGoalHours(Number(user?.dailyGoalHours ?? 4));
    }, [user]);

    useEffect(() => {
        const firstWindow = (settings?.quietHours ?? [])[0];
        setQuietEnabled(Boolean(firstWindow));
        setQuietStart(String(firstWindow?.start ?? '22:00'));
        setQuietEnd(String(firstWindow?.end ?? '07:00'));
    }, [settings?.quietHours]);

    useEffect(() => {
        AsyncStorage.getItem('app-language')
            .then((saved) => {
                if (saved) setSelectedLanguage(saved);
            })
            .catch(() => {
                /* ignore */
            });
    }, []);

    const bucketState = useMemo(() => ({
        ...DEFAULT_BUCKETS,
        ...(settings?.enabledBuckets ?? {}),
    }), [settings?.enabledBuckets]);

    const preDeadlineDays = Number(settings?.preDeadlineDays ?? 2);
    const streakReminderTime = String(settings?.streakReminderTime ?? '09:00');
    const groupedSummaries = Boolean(settings?.groupedSummaries);
    const positiveTone = Boolean(settings?.positiveTone);

    const handleSaveProfile = async () => {
        try {
            await updateProfile({
                username: username.trim(),
                email: email.trim(),
                dailyGoalHours,
            }).unwrap();
            refetchProfile();
        } catch {
            Alert.alert('Save failed', 'Could not update profile now.');
        }
    };

    const handleToggleBucket = async (bucketKey: keyof typeof DEFAULT_BUCKETS, enabled: boolean) => {
        try {
            await updateNudges({
                enabledBuckets: {
                    ...bucketState,
                    [bucketKey]: enabled,
                },
            }).unwrap();
            refetchNudges();
        } catch {
            Alert.alert('Update failed', 'Could not update notification setting.');
        }
    };

    const handleSaveQuietHours = async () => {
        try {
            await updateNudges({
                quietHours: quietEnabled ? [{ start: quietStart, end: quietEnd }] : [],
                ...getTimezonePayload(),
            }).unwrap();
            refetchNudges();
        } catch {
            Alert.alert('Update failed', 'Could not update quiet hours.');
        }
    };

    const handleSaveNudgeTiming = async (updates: Record<string, unknown>) => {
        try {
            await updateNudges({
                ...updates,
                ...getTimezonePayload(),
            } as any).unwrap();
            refetchNudges();
        } catch {
            Alert.alert('Update failed', 'Could not update notification timing.');
        }
    };

    const handleSaveLanguage = async (code: string) => {
        setSelectedLanguage(code);
        try {
            await AsyncStorage.setItem('app-language', code);
        } catch {
            /* ignore */
        }
    };

    const handleSharePairingCode = async () => {
        if (!pairingCode) return;
        try {
            await Share.share({
                title: 'WhatsApp Pairing Code',
                message: `Pairing code: ${pairingCode}`,
            });
        } catch {
            /* ignore */
        }
    };

    const handleUnpairWhatsApp = async () => {
        try {
            await unpairWhatsApp().unwrap();
            refetchPairing();
        } catch {
            Alert.alert('Unpair failed', 'Could not unpair WhatsApp.');
        }
    };

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await logoutApi().unwrap();
                    } catch {
                        /* ignore */
                    } finally {
                        dispatch(logoutAction());
                    }
                },
            },
        ]);
    };

    return (
        <ScreenWrapper scrollable>
            <GlassCard style={styles.userCard}>
                <View style={styles.avatarWrap}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarLetter}>
                            {username?.charAt(0)?.toUpperCase() ?? '?'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{username || 'Student'}</Text>
                        <Text style={styles.userEmail}>{email || ''}</Text>
                    </View>
                </View>

                <View style={styles.formRow}>
                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Username</Text>
                        <TextInput value={username} onChangeText={setUsername} style={styles.input} placeholder="Username" placeholderTextColor={Colors.textMuted} />
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Email</Text>
                        <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} autoCapitalize="none" keyboardType="email-address" />
                    </View>
                </View>

                <Text style={styles.fieldLabel}>Daily Goal</Text>
                <View style={styles.chipRow}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <TouchableOpacity
                            key={h}
                            onPress={() => setDailyGoalHours(h)}
                            style={[styles.chip, dailyGoalHours === h && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, dailyGoalHours === h && styles.chipTextActive]}>{h}h</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, isUpdatingProfile && styles.disabled]}
                    disabled={isUpdatingProfile}
                    onPress={() => void handleSaveProfile()}
                >
                    <Text style={styles.saveBtnText}>{isUpdatingProfile ? 'Saving…' : 'Save Profile'}</Text>
                </TouchableOpacity>
            </GlassCard>

            <GlassCard style={styles.card}>
                <Text style={styles.groupTitle}>Language & Region</Text>
                <View style={styles.langGrid}>
                    {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[styles.langCard, selectedLanguage === lang.code && styles.langCardActive]}
                            onPress={() => void handleSaveLanguage(lang.code)}
                        >
                            <Text style={styles.langFlag}>{lang.flag}</Text>
                            <Text style={styles.langName}>{lang.label}</Text>
                            <Text style={styles.langNative}>{lang.native}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </GlassCard>

            <GlassCard style={styles.card}>
                <Text style={styles.groupTitle}>Quiet Hours</Text>
                <View style={styles.switchRow}>
                    <Text style={styles.settingLabel}>Enable quiet hours</Text>
                    <Switch value={quietEnabled} onValueChange={setQuietEnabled} />
                </View>
                <View style={styles.formRow}>
                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>Start (HH:MM)</Text>
                        <TextInput value={quietStart} onChangeText={setQuietStart} style={styles.input} placeholder="22:00" placeholderTextColor={Colors.textMuted} />
                    </View>
                    <View style={styles.fieldWrap}>
                        <Text style={styles.fieldLabel}>End (HH:MM)</Text>
                        <TextInput value={quietEnd} onChangeText={setQuietEnd} style={styles.input} placeholder="07:00" placeholderTextColor={Colors.textMuted} />
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.saveBtn, isUpdatingNudges && styles.disabled]}
                    disabled={isUpdatingNudges}
                    onPress={() => void handleSaveQuietHours()}
                >
                    <Text style={styles.saveBtnText}>{isUpdatingNudges ? 'Saving…' : 'Save Quiet Hours'}</Text>
                </TouchableOpacity>
            </GlassCard>

            <GlassCard style={styles.card}>
                <Text style={styles.groupTitle}>Notifications</Text>
                {NOTIFICATION_BUCKETS.map((bucket) => (
                    <View key={bucket.key} style={styles.notificationRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.settingLabel}>{bucket.title}</Text>
                            <Text style={styles.settingHint}>{bucket.description}</Text>
                        </View>
                        <Switch
                            value={Boolean(bucketState[bucket.key])}
                            onValueChange={(value) => void handleToggleBucket(bucket.key, value)}
                        />
                    </View>
                ))}
                <View style={styles.notificationRow}>
                    <Text style={styles.settingLabel}>Grouped summaries</Text>
                    <Switch value={groupedSummaries} onValueChange={(v) => void handleSaveNudgeTiming({ groupedSummaries: v })} />
                </View>
                <View style={styles.notificationRow}>
                    <Text style={styles.settingLabel}>Positive tone</Text>
                    <Switch value={positiveTone} onValueChange={(v) => void handleSaveNudgeTiming({ positiveTone: v })} />
                </View>
                <Text style={styles.fieldLabel}>Pre-deadline Alerts</Text>
                <View style={styles.chipRow}>
                    {[1, 2, 3].map((d) => (
                        <TouchableOpacity
                            key={d}
                            style={[styles.chip, preDeadlineDays === d && styles.chipActive]}
                            onPress={() => void handleSaveNudgeTiming({ preDeadlineDays: d })}
                        >
                            <Text style={[styles.chipText, preDeadlineDays === d && styles.chipTextActive]}>{d} day{d > 1 ? 's' : ''}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.fieldLabel}>Streak Reminder</Text>
                <View style={styles.chipRow}>
                    {[
                        { label: '8:00 AM', value: '08:00' },
                        { label: '9:00 AM', value: '09:00' },
                        { label: '6:00 PM', value: '18:00' },
                    ].map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.chip, streakReminderTime === opt.value && styles.chipActive]}
                            onPress={() => void handleSaveNudgeTiming({ streakReminderTime: opt.value })}
                        >
                            <Text style={[styles.chipText, streakReminderTime === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </GlassCard>

            <GlassCard style={styles.card}>
                <Text style={styles.groupTitle}>Behavioral Intelligence</Text>
                <Text style={styles.metaLine}>Best send window: {(intelligenceData as any)?.intelligence?.bestSendWindow ?? '—'}</Text>
                <Text style={styles.metaLine}>
                    Open-rate lift: {(intelligenceData as any)?.intelligence?.expectedOpenRateLiftPct ?? 0}% • Confidence: {(intelligenceData as any)?.intelligence?.confidence ?? 'low'}
                </Text>
                <Text style={styles.metaLine}>
                    Active context: {(contextSignals as any)?.context?.screenActive ? 'Device active' : 'Quiet context'} • Non-urgent suppressed: {(contextSignals as any)?.context?.suppressNonUrgent ? 'Yes' : 'No'}
                </Text>
            </GlassCard>

            <GlassCard style={styles.card}>
                <Text style={styles.groupTitle}>WhatsApp Bot</Text>
                <Text style={styles.metaLine}>
                    Status: {whatsappVerified ? `Paired (${whatsappNumber || 'Verified'})` : 'Not paired'}
                </Text>
                {!whatsappVerified && (
                    <>
                        <Text style={styles.fieldLabel}>Pairing Code</Text>
                        <View style={styles.pairCodeBox}>
                            <Text style={styles.pairCodeText}>{pairingCode || 'Generating...'}</Text>
                        </View>
                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => void refetchPairing()}>
                                <Text style={styles.secondaryBtnText}>Refresh</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSharePairingCode()}>
                                <Text style={styles.saveBtnText}>Share Code</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                {whatsappVerified && (
                    <TouchableOpacity
                        style={[styles.dangerInlineBtn, isUnpairing && styles.disabled]}
                        disabled={isUnpairing}
                        onPress={() => void handleUnpairWhatsApp()}
                    >
                        <Text style={styles.dangerInlineText}>{isUnpairing ? 'Unpairing…' : 'Unpair WhatsApp'}</Text>
                    </TouchableOpacity>
                )}
            </GlassCard>

            <GlassCard style={styles.card}>
                <Text style={styles.groupTitle}>Account</Text>
                <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('FamilyConnect')}>
                    <Text style={styles.settingLabel}>👨‍👩‍👧 Family Connect</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Subscription')}>
                    <Text style={styles.settingLabel}>💳 Subscription</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('QRAttendance')}>
                    <Text style={styles.settingLabel}>📱 QR Attendance</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Advanced')}>
                    <Text style={styles.settingLabel}>⚙️ Advanced</Text>
                    <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
            </GlassCard>

            <TouchableOpacity
                style={[styles.logoutBtn, isLoggingOut && styles.disabled]}
                onPress={handleLogout}
                disabled={isLoggingOut}
            >
                <Text style={styles.logoutText}>{isLoggingOut ? 'Logging out…' : '🚪 Log Out'}</Text>
            </TouchableOpacity>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    userCard: { marginTop: Spacing['4'], marginBottom: Spacing['4'] },
    card: { marginBottom: Spacing['4'] },
    avatarWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing['4'], marginBottom: Spacing['4'] },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { color: '#fff', fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    userInfo: { flex: 1 },
    userName: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    userEmail: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 2 },
    groupTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: Spacing['2'] },
    formRow: { flexDirection: 'row', gap: Spacing['2'] },
    fieldWrap: { flex: 1 },
    fieldLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginBottom: 6, marginTop: Spacing['2'] },
    input: {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: Radius.md,
        color: Colors.textPrimary,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
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
    chipText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    chipTextActive: { color: Colors.primaryLight },
    saveBtn: {
        marginTop: Spacing['3'],
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
        paddingHorizontal: Spacing['3'],
    },
    saveBtnText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing['2'] },
    notificationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing['3'],
        paddingVertical: Spacing['2'],
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing['3'],
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    settingLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    settingHint: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    metaLine: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 4 },
    chevron: { color: Colors.textMuted, fontSize: 18 },
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
    langCard: {
        width: '48%',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        padding: Spacing['3'],
    },
    langCardActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
    langFlag: { fontSize: 22, marginBottom: 6 },
    langName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
    langNative: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    pairCodeBox: {
        marginTop: Spacing['1'],
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        paddingVertical: Spacing['3'],
        alignItems: 'center',
    },
    pairCodeText: { color: Colors.primaryLight, fontSize: Typography.fontSize.base, fontWeight: '700', letterSpacing: 1.2 },
    buttonRow: { flexDirection: 'row', gap: Spacing['2'], marginTop: Spacing['2'] },
    secondaryBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    secondaryBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '700' },
    dangerInlineBtn: {
        marginTop: Spacing['3'],
        alignSelf: 'flex-start',
        backgroundColor: `${Colors.error}22`,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
    },
    dangerInlineText: { color: Colors.error, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    logoutBtn: {
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderRadius: Radius.xl,
        paddingVertical: Spacing['4'],
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
        marginBottom: Spacing['8'],
    },
    logoutText: { color: Colors.error, fontSize: Typography.fontSize.base, fontWeight: '600' },
    disabled: { opacity: 0.6 },
});
