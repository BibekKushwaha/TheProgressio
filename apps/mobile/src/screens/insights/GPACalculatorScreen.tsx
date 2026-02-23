import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useGetGPAQuery,
    useWhatIfGPAMutation,
    useAddCourseGradeMutation,
    useDeleteCourseGradeMutation,
} from '@repo/store';
import type { InsightsScreenProps } from '../../navigation/types';

type Scale = 'INDIA_10' | 'US_4' | 'PERCENTAGE';

export const GPACalculatorScreen: React.FC<InsightsScreenProps<'GPACalculator'>> = ({ navigation }) => {
    const [scale, setScale] = useState<Scale>('INDIA_10');
    const [targetCgpa, setTargetCgpa] = useState('');
    const [remainingCredits, setRemainingCredits] = useState('');
    const [courseName, setCourseName] = useState('');
    const [courseCredits, setCourseCredits] = useState('');
    const [gradePoint, setGradePoint] = useState('');

    const { data, isLoading, refetch } = useGetGPAQuery(scale);
    const [whatIf, { data: whatIfResult, isLoading: isWhatIfLoading }] = useWhatIfGPAMutation();
    const [addCourseGrade, { isLoading: isAdding }] = useAddCourseGradeMutation();
    const [deleteCourseGrade] = useDeleteCourseGradeMutation();

    const result = (data as any)?.result ?? {};
    const courses = Array.isArray(result?.courses) ? result.courses : [];

    const runWhatIf = async () => {
        const target = Number(targetCgpa);
        const credits = Number(remainingCredits);
        if (!Number.isFinite(target) || !Number.isFinite(credits)) return;
        try {
            await whatIf({
                targetCGPA: target,
                remainingCredits: credits,
                scale,
            }).unwrap();
        } catch {
            /* ignore */
        }
    };

    const addCourse = async () => {
        const credits = Number(courseCredits);
        const gp = Number(gradePoint);
        if (!courseName.trim() || !Number.isFinite(credits) || !Number.isFinite(gp)) return;
        try {
            await addCourseGrade({
                courseName: courseName.trim(),
                credits,
                gradePoint: gp,
            }).unwrap();
            setCourseName('');
            setCourseCredits('');
            setGradePoint('');
            refetch();
        } catch {
            /* ignore */
        }
    };

    const summaryLabel = useMemo(() => {
        if (scale === 'US_4') return 'GPA / 4.0';
        if (scale === 'PERCENTAGE') return 'Percentage';
        return 'CGPA / 10';
    }, [scale]);

    return (
        <ScreenWrapper edges={['top', 'left', 'right']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'< Insights'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>GPA Calculator</Text>
                <TouchableOpacity onPress={refetch}>
                    <Text style={styles.refresh}>↻</Text>
                </TouchableOpacity>
            </View>

            <GlassCard style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{summaryLabel}</Text>
                <Text style={styles.summaryValue}>
                    {isLoading ? '—' : (result?.cgpa ?? 0).toFixed(2)}
                </Text>
                <Text style={styles.summaryMeta}>Total Credits: {result?.totalCredits ?? 0}</Text>
                <View style={styles.scaleRow}>
                    {(['INDIA_10', 'US_4', 'PERCENTAGE'] as Scale[]).map((s) => (
                        <TouchableOpacity
                            key={s}
                            onPress={() => setScale(s)}
                            style={[styles.scaleBtn, scale === s && styles.scaleBtnActive]}
                        >
                            <Text style={[styles.scaleText, scale === s && styles.scaleTextActive]}>{s}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </GlassCard>

            <GlassCard style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>What-if Simulator</Text>
                <TextInput
                    value={targetCgpa}
                    onChangeText={setTargetCgpa}
                    placeholder="Target CGPA"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="decimal-pad"
                    style={styles.input}
                />
                <TextInput
                    value={remainingCredits}
                    onChangeText={setRemainingCredits}
                    placeholder="Remaining Credits"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                />
                <TouchableOpacity
                    style={[styles.primaryBtn, isWhatIfLoading && styles.disabled]}
                    onPress={runWhatIf}
                    disabled={isWhatIfLoading}
                >
                    <Text style={styles.primaryText}>{isWhatIfLoading ? 'Calculating…' : 'Run Simulation'}</Text>
                </TouchableOpacity>

                {(whatIfResult as any)?.result && (
                    <View style={styles.whatIfResult}>
                        <Text style={styles.meta}>Required Avg: {(whatIfResult as any).result.requiredAverage?.toFixed?.(2) ?? '—'}</Text>
                        <Text style={styles.meta}>Projected GPA: {(whatIfResult as any).result.projectedGPA?.toFixed?.(2) ?? '—'}</Text>
                        <Text style={styles.meta}>{(whatIfResult as any).result.strategy ?? ''}</Text>
                    </View>
                )}
            </GlassCard>

            <GlassCard style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Add Course Grade</Text>
                <TextInput
                    value={courseName}
                    onChangeText={setCourseName}
                    placeholder="Course name"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.input}
                />
                <View style={styles.inlineInputs}>
                    <TextInput
                        value={courseCredits}
                        onChangeText={setCourseCredits}
                        placeholder="Credits"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        style={[styles.input, styles.inlineInput]}
                    />
                    <TextInput
                        value={gradePoint}
                        onChangeText={setGradePoint}
                        placeholder="Grade point"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="decimal-pad"
                        style={[styles.input, styles.inlineInput]}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.primaryBtn, isAdding && styles.disabled]}
                    onPress={addCourse}
                    disabled={isAdding}
                >
                    <Text style={styles.primaryText}>{isAdding ? 'Saving…' : 'Add Course'}</Text>
                </TouchableOpacity>
            </GlassCard>

            <Text style={styles.sectionHeader}>Course Breakdown</Text>
            <FlatList
                data={courses}
                keyExtractor={(item: any, idx) => item.id ?? String(idx)}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <GlassCard>
                        <Text style={styles.emptyText}>No course grades added yet.</Text>
                    </GlassCard>
                }
                renderItem={({ item }: { item: any }) => (
                    <GlassCard style={styles.courseCard}>
                        <View style={styles.courseRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.courseName}>{item.courseName}</Text>
                                <Text style={styles.meta}>Credits: {item.credits} • GP: {item.gradePoint}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={async () => {
                                    try {
                                        await deleteCourseGrade(item.id).unwrap();
                                        refetch();
                                    } catch {
                                        /* ignore */
                                    }
                                }}
                            >
                                <Text style={styles.deleteText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
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
    summaryCard: { marginBottom: Spacing['4'] },
    summaryLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { color: Colors.textPrimary, fontSize: Typography.fontSize['3xl'], fontWeight: '700', marginTop: 4 },
    summaryMeta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 2 },
    scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'], marginTop: Spacing['3'] },
    scaleBtn: {
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['1'],
    },
    scaleBtnActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}22` },
    scaleText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    scaleTextActive: { color: Colors.primaryLight },
    sectionCard: { marginBottom: Spacing['3'] },
    sectionTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '700', marginBottom: Spacing['2'] },
    input: {
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: Radius.md,
        color: Colors.textPrimary,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['3'],
        marginBottom: Spacing['2'],
    },
    inlineInputs: { flexDirection: 'row', gap: Spacing['2'] },
    inlineInput: { flex: 1 },
    primaryBtn: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.md,
        alignItems: 'center',
        paddingVertical: Spacing['3'],
    },
    primaryText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    whatIfResult: { marginTop: Spacing['2'], gap: 2 },
    meta: { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
    sectionHeader: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
    },
    list: { gap: Spacing['2'], paddingBottom: Spacing['8'] },
    courseCard: { marginBottom: Spacing['2'] },
    courseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
    courseName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    deleteBtn: {
        backgroundColor: `${Colors.error}22`,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['1'],
    },
    deleteText: { color: Colors.error, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    emptyText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
    disabled: { opacity: 0.5 },
});
