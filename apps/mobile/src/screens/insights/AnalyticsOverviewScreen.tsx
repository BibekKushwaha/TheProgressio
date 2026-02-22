import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetDashboardSummaryQuery,
    useGetSubjectPerformanceQuery,
    useGetPeakWindowQuery,
    useGetWeeklyTrendsQuery,
    useGetTimeLeakageQuery,
} from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';

const W = Dimensions.get('window').width;
const BAR_MAX_HEIGHT = 80;

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export const AnalyticsOverviewScreen: React.FC<InsightsScreenProps<'AnalyticsOverview'>> = ({ navigation }) => {
    const { data: summary } = useGetDashboardSummaryQuery(undefined);
    const { data: peakData } = useGetPeakWindowQuery();
    const { data: breakdown } = useGetWeeklyTrendsQuery(undefined);
    const { data: leakage } = useGetTimeLeakageQuery(undefined);
    const { data: subjects } = useGetSubjectPerformanceQuery('all' as any);

    const weeklyFocus: number[] = (breakdown as any)?.weeklyMinutes ?? [45, 90, 60, 120, 80, 30, 70];
    const maxFocus = Math.max(...weeklyFocus, 1);

    return (
        <ScreenWrapper scrollable>
            <View style={styles.header}>
                <Text style={styles.title}>📊 Analytics</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('StrategicAnalytics')}
                    style={styles.stratBtn}
                >
                    <Text style={styles.stratText}>Strategic →</Text>
                </TouchableOpacity>
            </View>

            {/* Stat cards row */}
            <View style={styles.statsRow}>
                {[
                    { label: 'Focus Score', value: `${(summary as any)?.focusScore ?? '—'}%`, icon: '🎯' },
                    { label: 'Hours This Week', value: `${Math.round((weeklyFocus.reduce((a, b) => a + b, 0)) / 60)}h`, icon: '⏳' },
                    { label: 'Tasks Done', value: (summary as any)?.tasksCompletedThisWeek ?? '—', icon: '✅' },
                ].map((s) => (
                    <GlassCard key={s.label} style={styles.statCard}>
                        <Text style={styles.statIcon}>{s.icon}</Text>
                        <Text style={styles.statValue}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </GlassCard>
                ))}
            </View>

            {/* Weekly focus bar chart */}
            <GlassCard style={styles.chartCard}>
                <Text style={styles.chartTitle}>Focus This Week</Text>
                <View style={styles.barChart}>
                    {weeklyFocus.map((mins, i) => {
                        const height = Math.max(4, (mins / maxFocus) * BAR_MAX_HEIGHT);
                        return (
                            <View key={i} style={styles.barCol}>
                                <Text style={styles.barValue}>{mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}m`}</Text>
                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, { height, backgroundColor: i === new Date().getDay() - 1 ? Colors.primary : Colors.primaryLight + '60' }]} />
                                </View>
                                <Text style={styles.barDay}>{DAYS[i]}</Text>
                            </View>
                        );
                    })}
                </View>
            </GlassCard>

            {/* Peak Productivity */}
            {peakData && (
                <GlassCard style={styles.peakCard}>
                    <Text style={styles.chartTitle}>⚡ Peak Productivity</Text>
                    <Text style={styles.peakDesc}>
                        Your most productive time is <Text style={styles.peakHighlight}>{(peakData as any).peakHour ?? 'morning'}</Text> with an average focus score of <Text style={styles.peakHighlight}>{(peakData as any).avgScore ?? '—'}%</Text>.
                    </Text>
                    <View style={styles.peakTips}>
                        {((peakData as any).insights ?? []).slice(0, 2).map((tip: string, i: number) => (
                            <View key={i} style={styles.tipRow}>
                                <View style={styles.tipDot} />
                                <Text style={styles.tipText}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                </GlassCard>
            )}

            {/* Subject Performance */}
            {subjects && (
                <GlassCard style={styles.subjectCard}>
                    <Text style={styles.chartTitle}>📚 Subject Performance</Text>
                    {((subjects as any).subjects ?? []).slice(0, 5).map((s: any) => (
                        <View key={s.name} style={styles.subjectRow}>
                            <Text style={styles.subjectName} numberOfLines={1}>{s.name}</Text>
                            <View style={styles.subjectBarBg}>
                                <View style={[styles.subjectBarFill, { width: `${s.score ?? 0}%`, backgroundColor: s.score > 70 ? Colors.success : s.score > 50 ? Colors.warning : Colors.error }]} />
                            </View>
                            <Text style={styles.subjectScore}>{s.score ?? 0}%</Text>
                        </View>
                    ))}
                </GlassCard>
            )}

            {/* Time Leakage */}
            {leakage && (
                <GlassCard style={styles.leakCard}>
                    <Text style={styles.chartTitle}>🕳️ Time Leakage</Text>
                    <Text style={styles.leakValue}>{(leakage as any).totalLeakageMinutes ?? 0} min/week</Text>
                    <Text style={styles.leakDesc}>{(leakage as any).insight ?? 'Your time tracking is looking great!'}</Text>
                </GlassCard>
            )}

            {/* Navigation to other analytics screens */}
            <View style={styles.navGrid}>
                {[
                    { label: '🏆 Exam War Room', screen: 'ExamWarRoom' as const },
                    { label: '🎓 GPA Calculator', screen: 'GPACalculator' as const },
                    { label: '🥇 Achievements', screen: 'Achievements' as const },
                    { label: '📄 Reports', screen: 'Reports' as const },
                ].map((item) => (
                    <TouchableOpacity
                        key={item.label}
                        style={styles.navCard}
                        onPress={() => navigation.navigate(item.screen)}
                    >
                        <Text style={styles.navCardText}>{item.label}</Text>
                        <Text style={styles.navCardChevron}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700' },
    stratBtn: { paddingHorizontal: Spacing['3'], paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
    stratText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm },
    statsRow: { flexDirection: 'row', gap: Spacing['3'], marginBottom: Spacing['4'] },
    statCard: { flex: 1, alignItems: 'center', padding: Spacing['3'] },
    statIcon: { fontSize: 20, marginBottom: 2 },
    statValue: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    statLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: 2 },
    chartCard: { marginBottom: Spacing['4'] },
    chartTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600', marginBottom: Spacing['4'] },
    barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: BAR_MAX_HEIGHT + 40 },
    barCol: { flex: 1, alignItems: 'center', gap: 4 },
    barValue: { color: Colors.textMuted, fontSize: 9 },
    barBg: { width: 20, height: BAR_MAX_HEIGHT, justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.surface },
    barFill: { width: '100%', borderRadius: 4 },
    barDay: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    peakCard: { marginBottom: Spacing['4'] },
    peakDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing['3'] },
    peakHighlight: { color: Colors.primaryLight, fontWeight: '700' },
    peakTips: { gap: Spacing['2'] },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['2'] },
    tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 5, flexShrink: 0 },
    tipText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, flex: 1 },
    subjectCard: { marginBottom: Spacing['4'] },
    subjectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], marginBottom: Spacing['2'] },
    subjectName: { width: 80, color: Colors.textSecondary, fontSize: Typography.fontSize.xs },
    subjectBarBg: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
    subjectBarFill: { height: '100%', borderRadius: 4 },
    subjectScore: { width: 34, color: Colors.textSecondary, fontSize: Typography.fontSize.xs, textAlign: 'right' },
    leakCard: { marginBottom: Spacing['4'] },
    leakValue: { color: Colors.error, fontSize: Typography.fontSize['2xl'], fontWeight: '700', marginBottom: 4 },
    leakDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    navGrid: { gap: Spacing['3'], marginBottom: Spacing['8'] },
    navCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing['4'], paddingVertical: Spacing['4'] },
    navCardText: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '500' },
    navCardChevron: { color: Colors.textMuted, fontSize: 20 },
});
