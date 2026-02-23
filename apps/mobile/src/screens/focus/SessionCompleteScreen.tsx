import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAppSelector, selectStreak } from '@repo/store';
import type { FocusScreenProps } from '../../navigation/types';

export const SessionCompleteScreen: React.FC<FocusScreenProps<'SessionComplete'>> = ({
    navigation, route,
}) => {
    const { duration, taskId } = route.params;
    const streakData = useAppSelector(selectStreak);
    const streak = typeof streakData === 'number' ? streakData : (streakData as any)?.streak ?? 0;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 40, friction: 5 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
    }, []);

    const mins = Math.round(duration / 60);
    const xpEarned = mins * 2; // 2 XP per minute

    return (
        <ScreenWrapper scrollable>
            <View style={styles.container}>
                {/* Glow */}
                <View style={styles.glow} />

                {/* Animated trophy */}
                <Animated.Text style={[styles.trophy, { transform: [{ scale: scaleAnim }] }]}>
                    🏆
                </Animated.Text>

                <Text style={styles.headline}>Session Complete!</Text>
                <Text style={styles.subline}>Excellent focus work 🔥</Text>

                {/* Stats */}
                <Animated.View style={[styles.statsGrid, { opacity: fadeAnim }]}>
                    <GlassCard style={styles.statCard}>
                        <Text style={styles.statValue}>{mins}m</Text>
                        <Text style={styles.statLabel}>Duration</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard}>
                        <Text style={[styles.statValue, { color: Colors.primary }]}>+{xpEarned}</Text>
                        <Text style={styles.statLabel}>XP Earned</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard}>
                        <Text style={styles.statValue}>🔥{streak ?? 0}</Text>
                        <Text style={styles.statLabel}>Streak</Text>
                    </GlassCard>
                </Animated.View>

                {/* Reward message */}
                <GlassCard style={styles.rewardCard}>
                    <Text style={styles.rewardTitle}>⭐ Nice Work!</Text>
                    <Text style={styles.rewardDesc}>
                        You focused for {mins} minutes. That&apos;s {Math.round(mins / 25)} Pomodoro{mins >= 50 ? 's' : ''}!
                        Keep building that streak.
                    </Text>
                </GlassCard>

                {/* Action buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => navigation.navigate('FocusSession', taskId ? { taskId } : undefined)}
                    >
                        <Text style={styles.primaryBtnText}>▶ Continue Focusing</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => navigation.navigate('FocusHistory')}
                    >
                        <Text style={styles.secondaryBtnText}>View History</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.ghostBtn}
                        onPress={() => navigation.getParent()?.navigate('HomeTab')}
                    >
                        <Text style={styles.ghostBtnText}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', paddingTop: Spacing['8'], paddingBottom: Spacing['8'] },
    glow: { position: 'absolute', top: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: Colors.primary, opacity: 0.06 },
    trophy: { fontSize: 80, marginBottom: Spacing['4'] },
    headline: { color: Colors.textPrimary, fontSize: Typography.fontSize['3xl'], fontWeight: '700', marginBottom: Spacing['1'] },
    subline: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, marginBottom: Spacing['6'] },
    statsGrid: { flexDirection: 'row', gap: Spacing['3'], marginBottom: Spacing['4'], width: '100%' },
    statCard: { flex: 1, alignItems: 'center' },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: '700' },
    statLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    rewardCard: { width: '100%', marginBottom: Spacing['6'] },
    rewardTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '700', marginBottom: Spacing['2'] },
    rewardDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20 },
    actions: { width: '100%', gap: Spacing['3'] },
    primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: Spacing['4'], alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
    primaryBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: '700' },
    secondaryBtn: { backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingVertical: Spacing['4'], alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    secondaryBtnText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '500' },
    ghostBtn: { alignItems: 'center', paddingVertical: Spacing['3'] },
    ghostBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
});
