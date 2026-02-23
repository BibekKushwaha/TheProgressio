import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { ScreenWrapper, GlassCard } from '../../components';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import {
    addTask,
    PriorityEnum,
    TaskStatus,
    useAddGradeEntryMutation,
    useAppDispatch,
    useCreateCategoryMutation,
    useCreateExamMutation,
    useCreateSubTaskMutation,
    useCreateTaskMutation,
    useGetCategoriesQuery,
    useGetTaskByIdQuery,
    useParseTaskMutation,
    usePreviewSubtasksMutation,
    useSmartCreateTaskMutation,
    useUpdateTaskMutation,
} from '@repo/store';
import type { TasksScreenProps } from '../../navigation/types';
import { sanitizeTaskId } from '../../utils/task';

const PRIORITY_OPTIONS: Array<{ label: string; value: PriorityEnum; color: string }> = [
    { label: 'Routine', value: PriorityEnum.LOW, color: Colors.success },
    { label: 'Medium', value: PriorityEnum.MEDIUM, color: Colors.warning },
    { label: 'Urgent', value: PriorityEnum.HIGH, color: Colors.error },
];

const EFFORT_OPTIONS = ['30m', '1h', '2h+'];

type EntryType = 'task' | 'exam';
type ExamSubMode = 'schedule' | 'result';
type ParsedMeta = { subject?: string; date?: string; time?: string };

export const CreateTaskScreen: React.FC<TasksScreenProps<'CreateTask'>> = ({ navigation, route }) => {
    const dispatch = useAppDispatch();
    const editingTaskId = sanitizeTaskId((route.params as any)?.taskId);
    const isEditing = Boolean(editingTaskId);

    const [entryType, setEntryType] = useState<EntryType>('task');
    const [examSubMode, setExamSubMode] = useState<ExamSubMode>('schedule');
    const [showManualDetails, setShowManualDetails] = useState(true);
    const [aiSubtaskEnabled, setAiSubtaskEnabled] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<PriorityEnum>(PriorityEnum.LOW);
    const [effort, setEffort] = useState('1h');
    const [isRecurring, setIsRecurring] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(
        (route?.params as any)?.prefillSubjectId
    );
    const [parsedDueDateISO, setParsedDueDateISO] = useState<string | null>(null);
    const [parsedMeta, setParsedMeta] = useState<ParsedMeta>({});
    const [subtasks, setSubtasks] = useState<Array<{ id: string | number; text: string; completed: boolean }>>([]);

    // Exam mode fields
    const [examType, setExamType] = useState('Midterm');
    const [obtainedMarks, setObtainedMarks] = useState('');
    const [totalMarks, setTotalMarks] = useState('100');
    const [chapter, setChapter] = useState('');
    const [examLocation, setExamLocation] = useState('');
    const [examDuration, setExamDuration] = useState('120');

    const { data: categories } = useGetCategoriesQuery(undefined);
    const { data: existingTask, isLoading: isLoadingTask } = useGetTaskByIdQuery(editingTaskId ?? '', {
        skip: !isEditing,
    });

    const [createTask, { isLoading: isCreatingTask }] = useCreateTaskMutation();
    const [updateTask, { isLoading: isUpdatingTask }] = useUpdateTaskMutation();
    const [smartCreateTask, { isLoading: isSmartCreating }] = useSmartCreateTaskMutation();
    const [parseTask, { isLoading: isParsingTask }] = useParseTaskMutation();
    const [previewSubtasks, { isLoading: isGeneratingSubtasks }] = usePreviewSubtasksMutation();
    const [createSubTask] = useCreateSubTaskMutation();
    const [createCategory] = useCreateCategoryMutation();
    const [addGradeEntry, { isLoading: isAddingGrade }] = useAddGradeEntryMutation();
    const [createExam, { isLoading: isCreatingExam }] = useCreateExamMutation();

    useEffect(() => {
        if (!existingTask) return;
        const task = existingTask as any;
        setTitle(task.title ?? '');
        setDescription(task.description ?? '');
        setPriority(task.priority ?? PriorityEnum.LOW);
        setEffort(task.effort ?? '1h');
        setIsRecurring(Boolean(task.isRecurring));
        setSelectedCategoryId(task.categoryId ?? undefined);
        setParsedDueDateISO(task.dueDate ?? null);
        const mappedSubtasks = (task.subtasks ?? task.subTasks ?? []).map((s: any) => ({
            id: s.id,
            text: s.title,
            completed: Boolean(s.completed),
        }));
        setSubtasks(mappedSubtasks);
    }, [existingTask]);

    // Debounced AI parse parity with docs
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (title.trim().length <= 5 || entryType !== 'task') {
                setParsedMeta({});
                return;
            }
            try {
                const result = await parseTask({ text: title }).unwrap();
                setParsedMeta({
                    subject: result?.subject,
                    date: result?.dueDate
                        ? new Date(result.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : undefined,
                    time: result?.dueDate
                        ? new Date(result.dueDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                        : undefined,
                });

                if (result?.dueDate) {
                    setParsedDueDateISO(result.dueDate);
                }
                if (result?.priority) {
                    setPriority(result.priority);
                }
                if (result?.effort) {
                    setEffort(result.effort);
                }
                if (result?.isRecurring !== undefined) {
                    setIsRecurring(result.isRecurring);
                }

                if (result?.subject && categories) {
                    const normalizedSubject = result.subject.toLowerCase();
                    const match = ((categories as any).data ?? categories ?? []).find(
                        (c: any) => c.name?.toLowerCase() === normalizedSubject
                    );
                    if (match?.id) {
                        setSelectedCategoryId(match.id);
                    }
                }
            } catch {
                // silent fail by design; manual fields remain editable
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [title, entryType, parseTask, categories]);

    const localDateTimeValue = useMemo(() => {
        if (!parsedDueDateISO) return '';
        const d = new Date(parsedDueDateISO);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
    }, [parsedDueDateISO]);

    const dueDateValue = localDateTimeValue ? localDateTimeValue.slice(0, 10) : '';
    const dueTimeValue = localDateTimeValue ? localDateTimeValue.slice(11, 16) : '';

    const updateDueDateTime = (nextDate: string, nextTime: string) => {
        if (!nextDate && !nextTime) {
            setParsedDueDateISO(null);
            return;
        }
        const safeDate = nextDate || new Date().toISOString().slice(0, 10);
        const safeTime = nextTime || '00:00';
        setParsedDueDateISO(new Date(`${safeDate}T${safeTime}`).toISOString());
    };

    const handleGenerateSubtasks = async () => {
        if (!title.trim()) return;
        try {
            const result = await previewSubtasks({ title, description }).unwrap();
            const generated = (result?.subtasks ?? []).map((s: any, index: number) => ({
                id: Date.now() + index,
                text: typeof s === 'string' ? s : s?.title ?? String(s),
                completed: false,
            }));
            setSubtasks(generated);
        } catch {
            Alert.alert('AI failed', 'Could not generate subtasks right now.');
        }
    };

    const resolveCategoryId = async (): Promise<string | undefined> => {
        const allCategories = ((categories as any).data ?? categories ?? []) as any[];
        const parsedSubject = parsedMeta.subject?.trim();

        if (parsedSubject) {
            const existing = allCategories.find((c) => c.name?.toLowerCase() === parsedSubject.toLowerCase());
            if (existing?.id) return existing.id;

            try {
                const created = await createCategory({
                    name: parsedSubject,
                    colorCode: '#6366F1',
                }).unwrap();
                return created?.id;
            } catch {
                return selectedCategoryId;
            }
        }

        return selectedCategoryId;
    };

    const persistSubtasks = async (taskId: string) => {
        const list = subtasks.map((s) => s.text.trim()).filter(Boolean).slice(0, 30);
        if (list.length === 0) return;
        await Promise.all(
            list.map(async (title) => {
                try {
                    await createSubTask({ taskId, title }).unwrap();
                } catch {
                    // keep parent save successful even if one subtask fails
                }
            })
        );
    };

    const handleSaveExamMode = async () => {
        if (!title.trim()) {
            Alert.alert('Validation', 'Please enter an exam title or subject.');
            return;
        }

        if (examSubMode === 'result') {
            const marks = parseFloat(obtainedMarks);
            const total = parseFloat(totalMarks);
            if (Number.isNaN(marks) || Number.isNaN(total) || total <= 0) {
                Alert.alert('Validation', 'Please enter valid marks.');
                return;
            }
            await addGradeEntry({
                examType,
                subjectName: parsedMeta.subject || title,
                chapter: chapter || undefined,
                obtainedMarks: marks,
                totalMarks: total,
            }).unwrap();
            Alert.alert('Success', 'Exam result logged.');
            navigation.goBack();
            return;
        }

        if (!parsedDueDateISO) {
            Alert.alert('Validation', 'Please specify an exam date/time.');
            return;
        }

        await createExam({
            title,
            date: parsedDueDateISO,
            durationMinutes: Number(examDuration) || 120,
            location: examLocation || undefined,
            subjectName: parsedMeta.subject || title,
            subjectId: selectedCategoryId,
            priority: 'HIGH',
        }).unwrap();
        Alert.alert('Success', 'Exam scheduled.');
        navigation.goBack();
    };

    const handleSaveTaskMode = async () => {
        if (!title.trim()) {
            Alert.alert('Validation', 'Task title is required.');
            return;
        }

        const shouldUseSmartCreate = !isEditing && title.trim().length > 80 && description.trim().length === 0;
        const categoryIdToUse = await resolveCategoryId();

        if (shouldUseSmartCreate) {
            const response = await smartCreateTask({ text: title }).unwrap();
            if (response?.task) {
                dispatch(addTask(response.task));
                Alert.alert('Success', 'Task created.');
                navigation.goBack();
                return;
            }
        }

        if (isEditing && editingTaskId) {
            await updateTask({
                id: editingTaskId,
                title: title.trim(),
                description,
                priority,
                categoryId: categoryIdToUse,
                dueDate: parsedDueDateISO || undefined,
                isRecurring,
                effort,
            }).unwrap();
            Alert.alert('Success', 'Task updated.');
            navigation.goBack();
            return;
        }

        const createdTask = await createTask({
            title: title.trim(),
            description,
            status: TaskStatus.PENDING,
            priority,
            categoryId: categoryIdToUse,
            dueDate: parsedDueDateISO || undefined,
            isRecurring,
            effort,
        } as any).unwrap();
        dispatch(addTask(createdTask as any));

        const createdTaskId = sanitizeTaskId((createdTask as any)?.id);
        if (createdTaskId) {
            await persistSubtasks(createdTaskId);
        }

        Alert.alert('Success', 'Task created.');
        navigation.goBack();
    };

    const handleSave = async () => {
        try {
            if (entryType === 'exam' && !isEditing) {
                await handleSaveExamMode();
                return;
            }
            await handleSaveTaskMode();
        } catch (err) {
            console.error('Create/Update failed', err);
            Alert.alert('Error', 'Failed to save. Please try again.');
        }
    };

    const isSubmitting =
        isCreatingTask || isUpdatingTask || isSmartCreating || isAddingGrade || isCreatingExam;

    if (isEditing && isLoadingTask) {
        return (
            <ScreenWrapper>
                <View style={styles.loadingCenter}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScreenWrapper scrollable edges={['top', 'left', 'right']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelText}>✕ Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{isEditing ? 'Edit Task' : 'New Entry'}</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isSubmitting}
                        style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
                    >
                        {isSubmitting
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.saveText}>{isEditing ? 'Update' : 'Save'}</Text>}
                    </TouchableOpacity>
                </View>

                {!isEditing && (
                    <View style={styles.modeRow}>
                        <TouchableOpacity
                            style={[styles.modeChip, entryType === 'task' && styles.modeChipActive]}
                            onPress={() => setEntryType('task')}
                        >
                            <Text style={[styles.modeText, entryType === 'task' && styles.modeTextActive]}>📋 Task</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeChip, entryType === 'exam' && styles.modeChipActive]}
                            onPress={() => setEntryType('exam')}
                        >
                            <Text style={[styles.modeText, entryType === 'exam' && styles.modeTextActive]}>📝 Exam</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <GlassCard style={styles.inputCard}>
                    <Text style={styles.label}>Summary *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={entryType === 'exam' ? 'e.g. Physics Midterm' : 'Describe your task...'}
                        placeholderTextColor={Colors.textMuted}
                        value={title}
                        onChangeText={setTitle}
                        multiline
                    />
                    {!!(isSmartCreating || isParsingTask) && <Text style={styles.parseHint}>AI is parsing...</Text>}
                    {(parsedMeta.subject || parsedMeta.date || parsedMeta.time) && (
                        <View style={styles.metaChipsRow}>
                            {parsedMeta.subject && <Text style={styles.metaChip}>📚 {parsedMeta.subject}</Text>}
                            {parsedMeta.date && <Text style={styles.metaChip}>📅 {parsedMeta.date}</Text>}
                            {parsedMeta.time && <Text style={styles.metaChip}>🕒 {parsedMeta.time}</Text>}
                        </View>
                    )}
                </GlassCard>

                {entryType === 'task' || isEditing ? (
                    <>
                        <View style={styles.selectorGrid}>
                            <GlassCard style={styles.selectorCell}>
                                <Text style={styles.label}>Subject</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.selectorRow}>
                                        <TouchableOpacity
                                            style={[styles.selectorChip, !selectedCategoryId && styles.selectedChip]}
                                            onPress={() => setSelectedCategoryId(undefined)}
                                        >
                                            <Text style={[styles.selectorText, !selectedCategoryId && styles.selectedChipText]}>None</Text>
                                        </TouchableOpacity>
                                        {((categories as any)?.data ?? categories ?? []).map((cat: any) => (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={[styles.selectorChip, selectedCategoryId === cat.id && styles.selectedChip]}
                                                onPress={() => setSelectedCategoryId(cat.id)}
                                            >
                                                <Text style={[styles.selectorText, selectedCategoryId === cat.id && styles.selectedChipText]}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </GlassCard>

                            <GlassCard style={styles.selectorCell}>
                                <Text style={styles.label}>Priority</Text>
                                <View style={styles.selectorRow}>
                                    {PRIORITY_OPTIONS.map((p) => (
                                        <TouchableOpacity
                                            key={p.value}
                                            style={[
                                                styles.selectorChip,
                                                priority === p.value && { borderColor: p.color, backgroundColor: `${p.color}22` },
                                            ]}
                                            onPress={() => setPriority(p.value)}
                                        >
                                            <Text style={[styles.selectorText, priority === p.value && { color: p.color }]}>
                                                {p.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </GlassCard>
                        </View>

                        <GlassCard style={styles.selectorCard}>
                            <Text style={styles.label}>Effort</Text>
                            <View style={styles.selectorRow}>
                                {EFFORT_OPTIONS.map((e) => (
                                    <TouchableOpacity
                                        key={e}
                                        style={[styles.selectorChip, effort === e && styles.selectedChip]}
                                        onPress={() => setEffort(e)}
                                    >
                                        <Text style={[styles.selectorText, effort === e && styles.selectedChipText]}>{e}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </GlassCard>

                        <View style={styles.manualHeaderRow}>
                            <TouchableOpacity onPress={() => setShowManualDetails((v) => !v)}>
                                <Text style={styles.manualToggleText}>
                                    {showManualDetails ? '▾' : '▸'} Manual Overrides & Details
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {showManualDetails && (
                            <>
                                <GlassCard style={styles.inputCard}>
                                    <Text style={styles.label}>Detailed Description</Text>
                                    <TextInput
                                        style={[styles.input, styles.multiline]}
                                        placeholder="Add specific instructions, links, or notes..."
                                        placeholderTextColor={Colors.textMuted}
                                        value={description}
                                        onChangeText={setDescription}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                </GlassCard>

                                <View style={styles.dateTimeRow}>
                                    <GlassCard style={styles.dateTimeCard}>
                                        <Text style={styles.label}>Due Date</Text>
                                        <TextInput
                                            value={dueDateValue}
                                            onChangeText={(v) => updateDueDateTime(v, dueTimeValue)}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={Colors.textMuted}
                                            style={styles.input}
                                        />
                                    </GlassCard>
                                    <GlassCard style={styles.dateTimeCard}>
                                        <Text style={styles.label}>Time</Text>
                                        <TextInput
                                            value={dueTimeValue}
                                            onChangeText={(v) => updateDueDateTime(dueDateValue, v)}
                                            placeholder="HH:MM"
                                            placeholderTextColor={Colors.textMuted}
                                            style={styles.input}
                                        />
                                    </GlassCard>
                                </View>

                                <View style={styles.toggleRow}>
                                    <Text style={styles.toggleLabel}>Recurring Task</Text>
                                    <TouchableOpacity
                                        style={[styles.switchTrack, isRecurring && styles.switchTrackActive]}
                                        onPress={() => setIsRecurring((v) => !v)}
                                    >
                                        <View style={[styles.switchThumb, isRecurring && styles.switchThumbActive]} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.toggleRow}>
                                    <Text style={styles.toggleLabel}>AI Subtask Generator</Text>
                                    <TouchableOpacity
                                        style={[styles.switchTrack, aiSubtaskEnabled && styles.switchTrackActive]}
                                        onPress={async () => {
                                            const next = !aiSubtaskEnabled;
                                            setAiSubtaskEnabled(next);
                                            if (next) {
                                                await handleGenerateSubtasks();
                                            }
                                        }}
                                    >
                                        <View style={[styles.switchThumb, aiSubtaskEnabled && styles.switchThumbActive]} />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        <GlassCard style={styles.subtaskCard}>
                            <View style={styles.subtaskHeader}>
                                <Text style={styles.label}>✨ AI Sub-Tasks</Text>
                                <TouchableOpacity
                                    onPress={handleGenerateSubtasks}
                                    disabled={isGeneratingSubtasks || !title.trim()}
                                    style={[styles.generateBtn, (isGeneratingSubtasks || !title.trim()) && styles.saveBtnDisabled]}
                                >
                                    {isGeneratingSubtasks
                                        ? <ActivityIndicator color={Colors.primary} size="small" />
                                        : <Text style={styles.generateText}>Generate</Text>}
                                </TouchableOpacity>
                            </View>
                            {subtasks.length === 0 && (
                                <Text style={styles.subtaskEmpty}>Enter a title then tap Generate to auto-create sub-tasks.</Text>
                            )}
                            {subtasks.map((s) => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={styles.subtaskRow}
                                    onPress={() => setSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, completed: !t.completed } : t))}
                                >
                                    <View style={[styles.subtaskCheck, s.completed && styles.subtaskCheckActive]}>
                                        {s.completed && <Text style={styles.subtaskCheckText}>✓</Text>}
                                    </View>
                                    <TextInput
                                        style={[styles.subtaskInput, s.completed && styles.subtaskDoneText]}
                                        value={s.text}
                                        onChangeText={(v) => setSubtasks((prev) => prev.map((t) => t.id === s.id ? { ...t, text: v } : t))}
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                    <TouchableOpacity onPress={() => setSubtasks((prev) => prev.filter((t) => t.id !== s.id))}>
                                        <Text style={styles.subtaskDelete}>✕</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                onPress={() => setSubtasks((prev) => [...prev, { id: Date.now(), text: '', completed: false }])}
                                style={styles.addSubtaskBtn}
                            >
                                <Text style={styles.addSubtaskText}>＋ Add manually</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </>
                ) : (
                    <GlassCard style={styles.selectorCard}>
                        <View style={styles.examModeRow}>
                            <TouchableOpacity
                                style={[styles.examModeBtn, examSubMode === 'schedule' && styles.examModeBtnActive]}
                                onPress={() => setExamSubMode('schedule')}
                            >
                                <Text style={[styles.examModeText, examSubMode === 'schedule' && styles.examModeTextActive]}>Schedule Exam</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.examModeBtn, examSubMode === 'result' && styles.examModeBtnActive]}
                                onPress={() => setExamSubMode('result')}
                            >
                                <Text style={[styles.examModeText, examSubMode === 'result' && styles.examModeTextActive]}>Log Result</Text>
                            </TouchableOpacity>
                        </View>

                        {examSubMode === 'result' ? (
                            <>
                                <Text style={styles.label}>Exam Type</Text>
                                <TextInput
                                    value={examType}
                                    onChangeText={setExamType}
                                    style={styles.input}
                                    placeholder="Midterm / Final / Quiz"
                                    placeholderTextColor={Colors.textMuted}
                                />
                                <Text style={styles.label}>Chapter (Optional)</Text>
                                <TextInput
                                    value={chapter}
                                    onChangeText={setChapter}
                                    style={styles.input}
                                    placeholder="e.g. Thermodynamics"
                                    placeholderTextColor={Colors.textMuted}
                                />
                                <View style={styles.dateTimeRow}>
                                    <View style={styles.dateTimeCardPlain}>
                                        <Text style={styles.label}>Obtained</Text>
                                        <TextInput
                                            value={obtainedMarks}
                                            onChangeText={setObtainedMarks}
                                            keyboardType="decimal-pad"
                                            style={styles.input}
                                            placeholder="85"
                                            placeholderTextColor={Colors.textMuted}
                                        />
                                    </View>
                                    <View style={styles.dateTimeCardPlain}>
                                        <Text style={styles.label}>Total</Text>
                                        <TextInput
                                            value={totalMarks}
                                            onChangeText={setTotalMarks}
                                            keyboardType="decimal-pad"
                                            style={styles.input}
                                            placeholder="100"
                                            placeholderTextColor={Colors.textMuted}
                                        />
                                    </View>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.dateTimeRow}>
                                    <View style={styles.dateTimeCardPlain}>
                                        <Text style={styles.label}>Exam Date</Text>
                                        <TextInput
                                            value={dueDateValue}
                                            onChangeText={(v) => updateDueDateTime(v, dueTimeValue)}
                                            style={styles.input}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={Colors.textMuted}
                                        />
                                    </View>
                                    <View style={styles.dateTimeCardPlain}>
                                        <Text style={styles.label}>Time</Text>
                                        <TextInput
                                            value={dueTimeValue}
                                            onChangeText={(v) => updateDueDateTime(dueDateValue, v)}
                                            style={styles.input}
                                            placeholder="HH:MM"
                                            placeholderTextColor={Colors.textMuted}
                                        />
                                    </View>
                                </View>
                                <Text style={styles.label}>Location</Text>
                                <TextInput
                                    value={examLocation}
                                    onChangeText={setExamLocation}
                                    style={styles.input}
                                    placeholder="e.g. Hall A"
                                    placeholderTextColor={Colors.textMuted}
                                />
                                <Text style={styles.label}>Duration (Minutes)</Text>
                                <TextInput
                                    value={examDuration}
                                    onChangeText={setExamDuration}
                                    keyboardType="number-pad"
                                    style={styles.input}
                                    placeholder="120"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </>
                        )}
                    </GlassCard>
                )}
            </ScreenWrapper>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing['4'], marginBottom: Spacing['4'] },
    cancelText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
    title: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: '700' },
    saveBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing['4'], paddingVertical: 8, borderRadius: Radius.full },
    saveBtnDisabled: { opacity: 0.5 },
    saveText: { color: '#fff', fontSize: Typography.fontSize.sm, fontWeight: '700' },
    modeRow: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['4'] },
    modeChip: { flex: 1, paddingVertical: Spacing['2'], borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
    modeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    modeText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '500' },
    modeTextActive: { color: '#fff' },
    inputCard: { marginBottom: Spacing['3'] },
    selectorCard: { marginBottom: Spacing['3'] },
    label: {
        color: Colors.textSecondary,
        fontSize: Typography.fontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing['2'],
    },
    input: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.base,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['3'],
        marginBottom: Spacing['2'],
    },
    multiline: { minHeight: 88, textAlignVertical: 'top' },
    parseHint: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, marginTop: Spacing['1'] },
    metaChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'], marginTop: Spacing['2'] },
    metaChip: {
        color: Colors.textPrimary,
        fontSize: Typography.fontSize.xs,
        backgroundColor: `${Colors.primary}22`,
        borderWidth: 1,
        borderColor: `${Colors.primary}66`,
        borderRadius: Radius.full,
        paddingHorizontal: Spacing['2'],
        paddingVertical: 4,
    },
    selectorGrid: { gap: Spacing['3'] },
    selectorCell: { marginBottom: Spacing['3'] },
    selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
    selectorChip: {
        paddingHorizontal: Spacing['3'],
        paddingVertical: 8,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    selectedChip: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    selectorText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    selectedChipText: { color: '#fff' },
    manualHeaderRow: { marginBottom: Spacing['2'] },
    manualToggleText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    dateTimeRow: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['2'] },
    dateTimeCard: { flex: 1 },
    dateTimeCardPlain: { flex: 1 },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['3'],
        marginBottom: Spacing['2'],
    },
    toggleLabel: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    switchTrack: {
        width: 42,
        height: 24,
        borderRadius: 12,
        backgroundColor: `${Colors.textMuted}55`,
        padding: 2,
    },
    switchTrackActive: { backgroundColor: `${Colors.primary}99` },
    switchThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    switchThumbActive: { transform: [{ translateX: 18 }] },
    subtaskCard: { marginBottom: Spacing['8'] },
    subtaskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2'] },
    generateBtn: {
        paddingHorizontal: Spacing['3'],
        paddingVertical: 6,
        borderRadius: Radius.full,
        backgroundColor: `${Colors.primary}22`,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    generateText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    subtaskEmpty: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginBottom: Spacing['2'] },
    subtaskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2'],
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    subtaskCheck: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtaskCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    subtaskCheckText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    subtaskInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.sm, paddingVertical: 2 },
    subtaskDoneText: { color: Colors.textMuted, textDecorationLine: 'line-through' },
    subtaskDelete: { color: Colors.textMuted, fontSize: Typography.fontSize.base, paddingHorizontal: 6 },
    addSubtaskBtn: { paddingVertical: Spacing['3'], alignItems: 'flex-start' },
    addSubtaskText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm, fontWeight: '600' },
    examModeRow: { flexDirection: 'row', gap: Spacing['2'], marginBottom: Spacing['3'] },
    examModeBtn: {
        flex: 1,
        paddingVertical: Spacing['2'],
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: 'center',
    },
    examModeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    examModeText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
    examModeTextActive: { color: '#fff' },
});
