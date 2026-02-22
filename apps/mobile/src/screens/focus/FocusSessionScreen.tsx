import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useStartLiveSessionMutation,
    usePauseLiveSessionMutation,
    useResumeLiveSessionMutation,
    useStopLiveSessionMutation,
    useHeartbeatLiveSessionMutation,
} from '@repo/store';
import type { FocusScreenProps } from '../../navigation/types';

const DURATION_OPTIONS = [25, 45, 60, 90]; // minutes

const AMBIENCES = [
    { icon: '🌧️', label: 'Rain' },
    { icon: '🎵', label: 'Lo-Fi' },
    { icon: '🌲', label: 'Forest' },
    { icon: '🔇', label: 'Silent' },
];

export const FocusSessionScreen: React.FC<FocusScreenProps<'FocusSession'>> = ({
    navigation,
    route,
}) => {
    const taskId = route?.params?.taskId;
    const [selectedDuration, setSelectedDuration] = useState(25);
    const [selectedAmbience, setSelectedAmbience] = useState('Silent');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(selectedDuration * 60);
    const [strictMode, setStrictMode] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // RTK mutations
    const [startSession] = useStartLiveSessionMutation();
    const [pauseSession] = usePauseLiveSessionMutation();
    const [resumeSession] = useResumeLiveSessionMutation();
    const [stopSession] = useStopLiveSessionMutation();
    const [heartbeat] = useHeartbeatLiveSessionMutation();

    // Circular progress animation
    const progressAnim = useRef(new Animated.Value(0)).current;
    const totalSeconds = selectedDuration * 60;

    useEffect(() => {
        setSecondsLeft(selectedDuration * 60);
        progressAnim.setValue(0);
    }, [selectedDuration]);

    useEffect(() => {
        if (isRunning && !isPaused) {
            intervalRef.current = setInterval(() => {
                setSecondsLeft((prev) => {
                    const next = prev - 1;
                    const progress = 1 - next / totalSeconds;
                    Animated.timing(progressAnim, {
                        toValue: progress,
                        duration: 800,
                        useNativeDriver: false,
                        easing: Easing.linear,
                    }).start();

                    if (next <= 0) {
                        clearInterval(intervalRef.current!);
                        handleComplete();
                    }
                    return Math.max(0, next);
                });
            }, 1000);

            // Heartbeat every 30s
            const hbInterval = setInterval(() => {
                if (sessionId) heartbeat({ sessionId }).catch(() => { });
            }, 30000);

            return () => {
                clearInterval(intervalRef.current!);
                clearInterval(hbInterval);
            };
        }
    }, [isRunning, isPaused, sessionId]);

    const handleStart = async () => {
        try {
            const res = await startSession({
                plannedDurationMinutes: selectedDuration,
                taskId: taskId ?? '',
            }).unwrap();
            setSessionId(res.session?.sessionId ?? null);
            setIsRunning(true);
            setIsPaused(false);
        } catch {
            // Offline mode – just start the timer locally
            setIsRunning(true);
            setIsPaused(false);
        }
    };

    const handlePause = async () => {
        clearInterval(intervalRef.current!);
        setIsPaused(true);
        if (sessionId) await pauseSession({ sessionId }).catch(() => { });
    };

    const handleResume = async () => {
        setIsPaused(false);
        if (sessionId) await resumeSession({ sessionId }).catch(() => { });
    };

    const handleStop = async () => {
        clearInterval(intervalRef.current!);
        setIsRunning(false);
        setIsPaused(false);
        setSecondsLeft(selectedDuration * 60);
        progressAnim.setValue(0);
        if (sessionId) await stopSession({ sessionId }).catch(() => { });
        setSessionId(null);
    };

    const handleComplete = async () => {
        setIsRunning(false);
        const elapsed = totalSeconds;
        if (sessionId) await stopSession({ sessionId }).catch(() => { });
        navigation.replace('SessionComplete', {
            sessionId: sessionId ?? 'local',
            duration: elapsed,
            taskId,
        });
    };

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeLabel = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Arc color interpolation
    const arcColor = progressAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [Colors.primary, Colors.secondary, Colors.success],
    });

    return (
        <ScreenWrapper scrollable>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>⏱️ Focus Session</Text>
                {!isRunning && (
                    <TouchableOpacity onPress={() => navigation.navigate('FocusHistory')} style={styles.histBtn}>
                        <Text style={styles.histText}>History</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Timer ring */}
            <View style={styles.ringWrap}>
                <View style={styles.ring}>
                    <Animated.View
                        style={[
                            styles.ringFill,
                            {
                                borderColor: arcColor,
                                // Simulate arc: rotate border
                                transform: [
                                    {
                                        rotate: progressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg'],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                    <View style={styles.ringCenter}>
                        <Text style={styles.timerText}>{timeLabel}</Text>
                        <Text style={styles.timerLabel}>
                            {isRunning ? (isPaused ? 'Paused' : 'Focusing') : 'Ready'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Duration picker – hidden when session running */}
            {!isRunning && (
                <GlassCard style={styles.durationCard}>
                    <Text style={styles.sectionLabel}>Session Length</Text>
                    <View style={styles.durationRow}>
                        {DURATION_OPTIONS.map((d) => (
                            <TouchableOpacity
                                key={d}
                                style={[styles.durChip, selectedDuration === d && styles.durChipActive]}
                                onPress={() => setSelectedDuration(d)}
                            >
                                <Text style={[styles.durText, selectedDuration === d && styles.durTextActive]}>
                                    {d}m
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </GlassCard>
            )}

            {/* Ambience selector */}
            <GlassCard style={styles.ambienceCard}>
                <Text style={styles.sectionLabel}>Ambience</Text>
                <View style={styles.ambienceRow}>
                    {AMBIENCES.map((a) => (
                        <TouchableOpacity
                            key={a.label}
                            style={[styles.ambienceChip, selectedAmbience === a.label && styles.ambienceActive]}
                            onPress={() => setSelectedAmbience(a.label)}
                        >
                            <Text style={styles.ambienceIcon}>{a.icon}</Text>
                            <Text style={[styles.ambienceLabel, selectedAmbience === a.label && styles.ambienceLabelActive]}>
                                {a.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </GlassCard>

            {/* Strict mode */}
            <TouchableOpacity
                style={styles.strictRow}
                onPress={() => setStrictMode(!strictMode)}
            >
                <View>
                    <Text style={styles.strictTitle}>Strict Mode</Text>
                    <Text style={styles.strictDesc}>Blocks other apps during session</Text>
                </View>
                <View style={[styles.toggle, strictMode && styles.toggleOn]}>
                    <View style={[styles.toggleThumb, strictMode && styles.toggleThumbOn]} />
                </View>
            </TouchableOpacity>

            {/* Controls */}
            <View style={styles.controls}>
                {!isRunning ? (
                    <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                        <Text style={styles.startText}>▶  Start Focus</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.runningControls}>
                        <TouchableOpacity
                            style={styles.controlBtn}
                            onPress={isPaused ? handleResume : handlePause}
                        >
                            <Text style={styles.controlBtnText}>{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={handleStop}>
                            <Text style={[styles.controlBtnText, { color: Colors.error }]}>■ Stop</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    histBtn: { paddingHorizontal: Spacing['3'], paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    histText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    ringWrap: { alignItems: 'center', marginVertical: Spacing['6'] },
    ring: {
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: Colors.surface, borderWidth: 12,
        borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    },
    ringFill: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        borderWidth: 12, borderColor: Colors.primary,
        borderTopColor: 'transparent', borderRightColor: 'transparent',
    },
    ringCenter: { alignItems: 'center' },
    timerText: { color: Colors.textPrimary, fontSize: Typography.fontSize['3xl'], fontWeight: '700', letterSpacing: -1 },
    timerLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginTop: 4 },
    durationCard: { marginBottom: Spacing['3'] },
    sectionLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['3'] },
    durationRow: { flexDirection: 'row', gap: Spacing['2'] },
    durChip: { flex: 1, paddingVertical: Spacing['2'], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.surface },
    durChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    durText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    durTextActive: { color: '#fff' },
    ambienceCard: { marginBottom: Spacing['3'] },
    ambienceRow: { flexDirection: 'row', gap: Spacing['2'] },
    ambienceChip: { flex: 1, alignItems: 'center', paddingVertical: Spacing['3'], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    ambienceActive: { borderColor: Colors.primary, backgroundColor: 'rgba(99,102,241,0.1)' },
    ambienceIcon: { fontSize: 20, marginBottom: 4 },
    ambienceLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    ambienceLabelActive: { color: Colors.primaryLight },
    strictRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing['4'], marginBottom: Spacing['5'], borderWidth: 1, borderColor: Colors.border },
    strictTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600', marginBottom: 2 },
    strictDesc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.border, padding: 2 },
    toggleOn: { backgroundColor: Colors.primary },
    toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    toggleThumbOn: { transform: [{ translateX: 20 }] },
    controls: { marginTop: Spacing['2'] },
    startBtn: { backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: Spacing['4'], alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
    startText: { color: '#fff', fontSize: Typography.fontSize.lg, fontWeight: '700' },
    runningControls: { flexDirection: 'row', gap: Spacing['3'] },
    controlBtn: { flex: 1, paddingVertical: Spacing['4'], borderRadius: Radius.xl, alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
    stopBtn: { borderColor: Colors.error + '40' },
    controlBtnText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600' },
});
