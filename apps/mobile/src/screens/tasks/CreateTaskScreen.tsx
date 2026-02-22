import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    useCreateTaskMutation,
    useGetCategoriesQuery,
    usePreviewSubtasksMutation,
    PriorityEnum,
} from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';

const PRIORITIES = [
    { label: 'High', value: PriorityEnum.HIGH, color: Colors.error },
    { label: 'Med', value: PriorityEnum.MEDIUM, color: Colors.warning },
    { label: 'Low', value: PriorityEnum.LOW, color: Colors.success },
];

const EFFORT_LABELS = ['1', '2', '3', '4', '5'];

export const CreateTaskScreen: React.FC<TasksScreenProps<'CreateTask'>> = ({ navigation, route }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<PriorityEnum>(PriorityEnum.MEDIUM);
    const [effort, setEffort] = useState(3);
    const [dueDate, setDueDate] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(route?.params?.prefillSubjectId);
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [isExamMode, setIsExamMode] = useState(false);

    const { data: categories } = useGetCategoriesQuery(undefined);
    const [createTask, { isLoading }] = useCreateTaskMutation();
    const [previewSubtasks, { isLoading: isGenerating }] = usePreviewSubtasksMutation();

    const handleGenerateSubtasks = async () => {
        if (!title.trim()) return;
        try {
            const res = await previewSubtasks({ title, description }).unwrap();
            setSubtasks((res?.subtasks ?? []).map((s: any) => typeof s === 'string' ? s : s.title ?? s));
        } catch (e) {
            console.error('AI subtask gen failed', e);
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) return;
        try {
            await createTask({
                title: title.trim(),
                description,
                priority,
                effort: String(effort),
                dueDate: dueDate || undefined,
                categoryId: selectedCategoryId,
            } as any).unwrap();
            navigation.goBack();
        } catch (e) {
            console.error('Create task failed', e);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <ScreenWrapper scrollable edges={['top', 'left', 'right']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelText}>✕ Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>New Task</Text>
                    <TouchableOpacity
                        onPress={handleCreate}
                        disabled={isLoading || !title.trim()}
                        style={[styles.saveBtn, (!title.trim() || isLoading) && styles.saveBtnDisabled]}
                    >
                        {isLoading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.saveText}>Save</Text>
                        }
                    </TouchableOpacity>
                </View>

                {/* Mode toggle: Task / Exam Result */}
                <View style={styles.modeRow}>
                    <TouchableOpacity
                        style={[styles.modeChip, !isExamMode && styles.modeChipActive]}
                        onPress={() => setIsExamMode(false)}
                    >
                        <Text style={[styles.modeText, !isExamMode && styles.modeTextActive]}>📋 Task</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeChip, isExamMode && styles.modeChipActive]}
                        onPress={() => setIsExamMode(true)}
                    >
                        <Text style={[styles.modeText, isExamMode && styles.modeTextActive]}>📝 Exam Result</Text>
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <GlassCard style={styles.inputCard}>
                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={isExamMode ? 'e.g. Math Final Exam' : 'e.g. Complete Chapter 4 notes'}
                        placeholderTextColor={Colors.textMuted}
                        value={title}
                        onChangeText={setTitle}
                        multiline
                    />
                </GlassCard>

                {/* Description */}
                <GlassCard style={styles.inputCard}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.multiline]}
                        placeholder="Add details…"
                        placeholderTextColor={Colors.textMuted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </GlassCard>

                {/* Due Date */}
                <GlassCard style={styles.inputCard}>
                    <Text style={styles.label}>Due Date</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.textMuted}
                        value={dueDate}
                        onChangeText={setDueDate}
                        keyboardType="numbers-and-punctuation"
                    />
                </GlassCard>

                {/* Priority */}
                <GlassCard style={styles.selectorCard}>
                    <Text style={styles.label}>Priority</Text>
                    <View style={styles.selectorRow}>
                        {PRIORITIES.map((p) => (
                            <TouchableOpacity
                                key={p.value}
                                style={[styles.selectorChip, priority === p.value && { borderColor: p.color, backgroundColor: p.color + '15' }]}
                                onPress={() => setPriority(p.value as any)}
                            >
                                <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                                <Text style={[styles.selectorText, priority === p.value && { color: p.color }]}>{p.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </GlassCard>

                {/* Effort */}
                <GlassCard style={styles.selectorCard}>
                    <Text style={styles.label}>Effort Level</Text>
                    <View style={styles.selectorRow}>
                        {EFFORT_LABELS.map((e, i) => (
                            <TouchableOpacity
                                key={e}
                                style={[styles.selectorChip, effort === i + 1 && styles.effortActive]}
                                onPress={() => setEffort(i + 1)}
                            >
                                <Text style={[styles.selectorText, effort === i + 1 && styles.effortActiveText]}>{e}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.effortHint}>{['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'][effort]}</Text>
                </GlassCard>

                {/* Subject / Category */}
                {categories && (
                    <GlassCard style={styles.selectorCard}>
                        <Text style={styles.label}>Subject</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.selectorRow}>
                                <TouchableOpacity
                                    style={[styles.selectorChip, !selectedCategoryId && styles.effortActive]}
                                    onPress={() => setSelectedCategoryId(undefined)}
                                >
                                    <Text style={[styles.selectorText, !selectedCategoryId && styles.effortActiveText]}>None</Text>
                                </TouchableOpacity>
                                {((categories as any).data ?? categories ?? []).map((cat: any) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.selectorChip, selectedCategoryId === cat.id && styles.effortActive]}
                                        onPress={() => setSelectedCategoryId(cat.id)}
                                    >
                                        <Text style={[styles.selectorText, selectedCategoryId === cat.id && styles.effortActiveText]}>
                                            {cat.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </GlassCard>
                )}

                {/* AI Subtasks */}
                <GlassCard style={styles.subtaskCard}>
                    <View style={styles.subtaskHeader}>
                        <Text style={styles.label}>✨ AI Sub-Tasks</Text>
                        <TouchableOpacity
                            onPress={handleGenerateSubtasks}
                            disabled={isGenerating || !title.trim()}
                            style={[styles.generateBtn, (isGenerating || !title.trim()) && styles.generateBtnDisabled]}
                        >
                            {isGenerating
                                ? <ActivityIndicator color={Colors.primary} size="small" />
                                : <Text style={styles.generateText}>Generate</Text>
                            }
                        </TouchableOpacity>
                    </View>
                    {subtasks.length === 0 && (
                        <Text style={styles.subtaskEmpty}>Enter a title then tap Generate to auto-create sub-tasks.</Text>
                    )}
                    {subtasks.map((s, i) => (
                        <View key={i} style={styles.subtaskRow}>
                            <View style={styles.subtaskDot} />
                            <TextInput
                                style={styles.subtaskInput}
                                value={s}
                                onChangeText={(v) => setSubtasks((prev) => prev.map((old, j) => j === i ? v : old))}
                                placeholderTextColor={Colors.textMuted}
                            />
                            <TouchableOpacity onPress={() => setSubtasks((prev) => prev.filter((_, j) => j !== i))}>
                                <Text style={styles.subtaskDelete}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    <TouchableOpacity
                        onPress={() => setSubtasks((prev) => [...prev, ''])}
                        style={styles.addSubtaskBtn}
                    >
                        <Text style={styles.addSubtaskText}>＋ Add manually</Text>
                    </TouchableOpacity>
                </GlassCard>
            </ScreenWrapper>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    cancelText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing['4'], paddingVertical: 8, borderRadius: Radius.full },
    saveBtnDisabled: { opacity: 0.4 },
    saveText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '600' },
    modeRow: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['4'] },
    modeChip: { flex: 1, paddingVertical: Spacing['2'], borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
    modeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    modeText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '500' },
    modeTextActive: { color: '#fff' },
    inputCard: { marginBottom: Spacing['3'] },
    label: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing['2'] },
    input: { color: Colors.textPrimary, fontSize: Typography.fontSize.base },
    multiline: { minHeight: 64 },
    selectorCard: { marginBottom: Spacing['3'] },
    selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
    selectorChip: { paddingHorizontal: Spacing['3'], paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', gap: 4 },
    selectorText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    priorityDot: { width: 8, height: 8, borderRadius: 4 },
    effortActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    effortActiveText: { color: '#fff' },
    effortHint: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 6 },
    subtaskCard: { marginBottom: Spacing['8'] },
    subtaskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['3'] },
    subtaskEmpty: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginBottom: Spacing['2'] },
    generateBtn: { paddingHorizontal: Spacing['3'], paddingVertical: 6, borderRadius: Radius.full, backgroundColor: 'rgba(99,102,241,0.15)', borderWidth: 1, borderColor: Colors.primary },
    generateBtnDisabled: { opacity: 0.4 },
    generateText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '600' },
    subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
    subtaskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, flexShrink: 0 },
    subtaskInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.sm },
    subtaskDelete: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, padding: 4 },
    addSubtaskBtn: { paddingVertical: Spacing['3'], alignItems: 'flex-start' },
    addSubtaskText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm },
});
