import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetRevisionScheduleQuery, useGetGradeEntriesQuery } from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';

type Tab = 'overview' | 'academic' | 'revision';

export const ExamWarRoomScreen: React.FC<InsightsScreenProps<'ExamWarRoom'>> = ({ route }) => {
    const [activeTab, setActiveTab] = useState<Tab>(route?.params?.tab ?? 'overview');
    const { data: revision } = useGetRevisionScheduleQuery('JEE');
    const { data: grades } = useGetGradeEntriesQuery(undefined as any);

    const gradeEntries: any[] = Array.isArray((grades as any)?.entries)
        ? (grades as any).entries
        : Array.isArray((grades as any)?.data)
            ? (grades as any).data
            : Array.isArray(grades)
                ? (grades as any[])
                : [];

    const revisionItems: any[] = Array.isArray((revision as any)?.schedule)
        ? (revision as any).schedule
        : Array.isArray((revision as any)?.topics)
            ? (revision as any).topics
            : Array.isArray(revision)
                ? (revision as any[])
                : [];

    const TABS: { key: Tab; label: string }[] = [
        { key: 'overview', label: '📋 Overview' },
        { key: 'academic', label: '🎓 Academic' },
        { key: 'revision', label: '📚 Revision' },
    ];

    return (
        <ScreenWrapper scrollable>
            <Text style={styles.title}>⚔️ Exam War Room</Text>

            {/* Tab selector */}
            <View style={styles.tabs}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tab, activeTab === t.key && styles.tabActive]}
                        onPress={() => setActiveTab(t.key)}
                    >
                        <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Overview tab */}
            {activeTab === 'overview' && (
                <View>
                    <GlassCard style={styles.overviewCard}>
                        <Text style={styles.overviewTitle}>📅 Exam Countdown</Text>
                        <Text style={styles.overviewDesc}>Track upcoming exams and deadlines in one place.</Text>
                    </GlassCard>
                    <GlassCard style={styles.overviewCard}>
                        <Text style={styles.overviewTitle}>🤖 AI Study Plan</Text>
                        <Text style={styles.overviewDesc}>
                            Based on your schedule and performance, here are your recommended focus areas.
                        </Text>
                        <Text style={styles.comingSoon}>Connect your calendar to activate</Text>
                    </GlassCard>
                </View>
            )}

            {/* Academic tab */}
            {activeTab === 'academic' && (
                <View>
                    <Text style={styles.sectionTitle}>Grade Overview</Text>
                    {gradeEntries.length === 0 && (
                        <GlassCard>
                            <Text style={styles.emptyText}>No grade entries yet. Add your results to track performance.</Text>
                        </GlassCard>
                    )}
                    {gradeEntries.map((g: any, i: number) => {
                        const totalMarks = Number(g.totalMarks ?? 0);
                        const obtainedMarks = Number(g.obtainedMarks ?? 0);
                        const computedScore = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : undefined;
                        const score = Number.isFinite(Number(g.score)) ? Number(g.score) : computedScore;
                        const isGoodScore = typeof score === 'number' ? score >= 70 : false;

                        return (
                        <GlassCard key={g.id ?? i} style={styles.gradeCard}>
                            <View style={styles.gradeRow}>
                                <View style={styles.gradeInfo}>
                                    <Text style={styles.gradeSubject}>{g.subject?.name ?? g.subjectName ?? 'Subject'}</Text>
                                    <Text style={styles.gradeExam}>{g.examType ?? 'Exam'}</Text>
                                </View>
                                <View style={[styles.gradeBadge, { backgroundColor: isGoodScore ? Colors.success + '20' : Colors.error + '20' }]}>
                                    <Text style={[styles.gradeScore, { color: isGoodScore ? Colors.success : Colors.error }]}>
                                        {typeof score === 'number' ? `${score}%` : '—'}
                                    </Text>
                                </View>
                            </View>
                        </GlassCard>
                    )})}
                </View>
            )}

            {/* Revision tab */}
            {activeTab === 'revision' && (
                <View>
                    <Text style={styles.sectionTitle}>Spaced Repetition Schedule</Text>
                    {revisionItems.length === 0 && (
                        <GlassCard>
                            <Text style={styles.emptyText}>Add exam results to generate a personalized revision schedule.</Text>
                        </GlassCard>
                    )}
                    {revisionItems.map((topic: any, i: number) => {
                        const topicName =
                            topic.name ??
                            [topic.subject, topic.chapter].filter(Boolean).join(' • ') ??
                            'Revision item';
                        const dueLabel = topic.nextRevision ?? topic.time ?? 'Today';
                        const priority = topic.priority ?? topic.type ?? 'medium';
                        const isHigh = String(priority).toLowerCase() === 'high';

                        return (
                        <GlassCard key={topic.id ?? i} style={styles.revCard}>
                            <View style={styles.revRow}>
                                <View style={styles.revInfo}>
                                    <Text style={styles.revTopic}>{topicName}</Text>
                                    <Text style={styles.revDue}>Due: {dueLabel}</Text>
                                </View>
                                <View style={[styles.urgencyBadge, { backgroundColor: isHigh ? Colors.error + '20' : Colors.warning + '20' }]}>
                                    <Text style={[styles.urgencyText, { color: isHigh ? Colors.error : Colors.warning }]}>
                                        {String(priority)}
                                    </Text>
                                </View>
                            </View>
                        </GlassCard>
                    )})}
                </View>
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    tabs: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['4'], flexWrap: 'wrap' },
    tab: { paddingHorizontal: Spacing['3'], paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '500' },
    tabTextActive: { color: '#fff' },
    overviewCard: { marginBottom: Spacing['3'] },
    overviewTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '600', marginBottom: Spacing['2'] },
    overviewDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 20 },
    comingSoon: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: Spacing['2'] },
    sectionTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['3'] },
    gradeCard: { marginBottom: Spacing['2'] },
    gradeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    gradeInfo: { flex: 1 },
    gradeSubject: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    gradeExam: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    gradeBadge: { paddingHorizontal: Spacing['3'], paddingVertical: 6, borderRadius: Radius.full },
    gradeScore: { fontSize: Typography.fontSize.base, fontWeight: '700' },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, lineHeight: 20 },
    revCard: { marginBottom: Spacing['2'] },
    revRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    revInfo: { flex: 1 },
    revTopic: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    revDue: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    urgencyBadge: { paddingHorizontal: Spacing['2'], paddingVertical: 4, borderRadius: Radius.full },
    urgencyText: { fontSize: Typography.fontSize.xs, fontWeight: '600' },
});
