import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useGetStrategicSummaryQuery } from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';

const SWOT_LABELS = [
    { key: 'strengths', label: '💪 Strengths', color: Colors.success },
    { key: 'weaknesses', label: '⚠️ Weaknesses', color: Colors.warning },
    { key: 'opportunities', label: '🚀 Opportunities', color: Colors.primary },
    { key: 'threats', label: '🔥 Threats', color: Colors.error },
];

export const StrategicAnalyticsScreen: React.FC<InsightsScreenProps<'StrategicAnalytics'>> = () => {
    const { data: strategic, isLoading } = useGetStrategicSummaryQuery(undefined);
    const [openSection, setOpenSection] = useState<string | null>('strengths');

    const swot = (strategic as any)?.swot ?? {};
    const insights = (strategic as any)?.insights ?? [];

    return (
        <ScreenWrapper scrollable>
            <Text style={styles.title}>🧠 Strategic Analytics</Text>

            {/* SWOT Accordion */}
            <Text style={styles.sectionTitle}>SWOT Analysis</Text>
            {SWOT_LABELS.map(({ key, label, color }) => (
                <GlassCard key={key} style={[styles.swotCard, openSection === key && { borderColor: color + '50' }]}>
                    <TouchableOpacity
                        style={styles.swotHeader}
                        onPress={() => setOpenSection(openSection === key ? null : key)}
                    >
                        <Text style={[styles.swotLabel, { color }]}>{label}</Text>
                        <Text style={styles.swotChevron}>{openSection === key ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {openSection === key && (
                        <View style={styles.swotBody}>
                            {isLoading && <Text style={styles.loadingText}>Analyzing…</Text>}
                            {!isLoading && (swot[key] ?? []).length === 0 && (
                                <Text style={styles.emptyText}>Not enough data yet. Keep tracking!</Text>
                            )}
                            {(swot[key] ?? []).map((item: string, i: number) => (
                                <View key={i} style={styles.swotItem}>
                                    <View style={[styles.swotDot, { backgroundColor: color }]} />
                                    <Text style={styles.swotItemText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </GlassCard>
            ))}

            {/* Productivity Insights */}
            <Text style={styles.sectionTitle}>📈 Productivity Insights</Text>
            {isLoading && <Text style={styles.loadingText}>Loading insights…</Text>}
            {insights.map((insight: any, i: number) => (
                <GlassCard key={i} style={styles.insightCard}>
                    <View style={styles.insightRow}>
                        <View style={[styles.insightBadge, { backgroundColor: (insight.trend === 'up' ? Colors.success : Colors.warning) + '20' }]}>
                            <Text style={styles.insightBadgeText}>{insight.trend === 'up' ? '📈' : '📉'}</Text>
                        </View>
                        <View style={styles.insightBody}>
                            <Text style={styles.insightTitle}>{insight.title ?? 'Insight'}</Text>
                            <Text style={styles.insightDesc}>{insight.description ?? insight}</Text>
                        </View>
                    </View>
                </GlassCard>
            ))}
            {!isLoading && insights.length === 0 && (
                <GlassCard style={styles.insightCard}>
                    <Text style={styles.emptyText}>Track more sessions to unlock AI insights!</Text>
                </GlassCard>
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize['2xl'], fontWeight: '700', paddingTop: Spacing['4'], marginBottom: Spacing['5'] },
    sectionTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['3'], marginTop: Spacing['2'] },
    swotCard: { marginBottom: Spacing['2'] },
    swotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    swotLabel: { fontSize: Typography.fontSize.base, fontWeight: '600' },
    swotChevron: { color: Colors.textMuted, fontSize: 12 },
    swotBody: { marginTop: Spacing['3'], gap: Spacing['2'] },
    swotItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing['2'] },
    swotDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
    swotItemText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, flex: 1, lineHeight: 20 },
    insightCard: { marginBottom: Spacing['3'] },
    insightRow: { flexDirection: 'row', gap: Spacing['3'], alignItems: 'flex-start' },
    insightBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    insightBadgeText: { fontSize: 18 },
    insightBody: { flex: 1 },
    insightTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600', marginBottom: 2 },
    insightDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, lineHeight: 18 },
    loadingText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, marginBottom: Spacing['4'] },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
});
