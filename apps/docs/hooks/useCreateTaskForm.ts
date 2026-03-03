// hooks/useCreateTaskForm.ts
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    useSmartCreateTaskMutation,
    usePreviewSubtasksMutation,
    useCreateTaskMutation,
    useCreateSubTaskMutation,
    useUpdateTaskMutation,
    useGetTaskByIdQuery,
    useParseTaskMutation,
    PriorityEnum,
    TaskStatus,
    addTask,
    useGetCategoriesQuery,
    useCreateCategoryMutation,
    useAddGradeEntryMutation,
    useCreateExamMutation,
    useGetSubjectsQuery,
    useAppDispatch,
    type Task,
    type Category,
} from '@repo/store';
import type { Subject } from '@repo/store';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// ── Shared constants ────────────────────────────────────────────────────────
export const EFFORT_OPTIONS = ['30m', '1h', '2h', '4h+'] as const;
export type EffortOption = typeof EFFORT_OPTIONS[number];

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shift a local Date object to "apparent UTC" so the backend stores the number
 * the user typed, not the true UTC equivalent.
 * e.g. user picks 15:00 in UTC+5:30 → stored as "2026-03-02T15:00:00.000Z"
 */
export const toApparentUtcIso = (d: Date): string => {
    const apparent = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return apparent.toISOString();
};

/** Map a raw effort string (e.g. "1.5h", "3h", "45m") to the nearest UI bucket. */
export const normalizeEffortValue = (value?: string | null): EffortOption => {
    if (!value) return '1h';
    const s = value.trim().toLowerCase();
    const minuteMatch = s.match(/^(\d+(?:\.\d+)?)m$/);
    if (minuteMatch) {
        const mins = parseFloat(minuteMatch[1]!);
        if (mins <= 45) return '30m';
        if (mins <= 90) return '1h';
        if (mins <= 150) return '2h';
        return '4h+';
    }
    const hourMatch = s.match(/^(\d+(?:\.\d+)?)h\+?$/);
    if (hourMatch) {
        const hrs = parseFloat(hourMatch[1]!);
        if (hrs <= 0.75) return '30m';
        if (hrs <= 1.5) return '1h';
        if (hrs <= 3) return '2h';
        return '4h+';
    }
    return '1h';
};

// ── Draft subtask shape ──────────────────────────────────────────────────────
export interface SubtaskDraft {
    id: string | number;
    text: string;
    completed: boolean;
}

// ── Hook return type ─────────────────────────────────────────────────────────
export interface CreateTaskFormResult {
    // task form
    taskDescription: string;
    setTaskDescription: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    selectedSubjectId: string;
    setSelectedSubjectId: (v: string) => void;
    selectedPriority: string;
    setSelectedPriority: (v: string) => void;
    selectedEffort: EffortOption;
    setSelectedEffort: (v: EffortOption) => void;
    subtasks: SubtaskDraft[];
    setSubtasks: (v: SubtaskDraft[]) => void;
    isRecurring: boolean;
    setIsRecurring: (v: boolean) => void;
    showManualDetails: boolean;
    setShowManualDetails: (v: boolean) => void;
    aiSubtaskEnabled: boolean;
    setAiSubtaskEnabled: (v: boolean) => void;
    // exam form
    entryType: 'task' | 'exam';
    setEntryType: (v: 'task' | 'exam') => void;
    examSubMode: 'schedule' | 'result';
    setExamSubMode: (v: 'schedule' | 'result') => void;
    examType: string;
    setExamType: (v: string) => void;
    obtainedMarks: string;
    setObtainedMarks: (v: string) => void;
    totalMarks: string;
    setTotalMarks: (v: string) => void;
    chapter: string;
    setChapter: (v: string) => void;
    examLocation: string;
    setExamLocation: (v: string) => void;
    examDuration: string;
    setExamDuration: (v: string) => void;
    selectedExamSubjectId: string;
    setSelectedExamSubjectId: (v: string) => void;
    // parsed
    parsedMeta: { subject?: string; date?: string; time?: string };
    parsedDueDate: string | null;
    hasExplicitDueDate: boolean;
    matchedCategoryForChip: Category | undefined;
    dueDateValue: string;
    dueTimeValue: string;
    // remote data
    taskId: string | null;
    existingTask: Task | undefined;
    isLoadingTask: boolean;
    categories: Category[] | undefined;
    subjects: Subject[] | undefined;
    // loading flags
    isSubmitting: boolean;
    isParsingTask: boolean;
    isSmartCreating: boolean;
    // handlers
    handleSaveTask: () => Promise<void>;
    handleGenerateSubtasks: () => Promise<void>;
    updateDueDateTime: (nextDate: string, nextTime: string, dateUpdated?: boolean) => void;
}

// ── The hook ─────────────────────────────────────────────────────────────────
export function useCreateTaskForm(): CreateTaskFormResult {
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskId = searchParams.get('id');
    const dispatch = useAppDispatch();

    // ── Form state ──────────────────────────────────────────────────────────
    const [taskDescription, setTaskDescription] = useState('');
    const [description, setDescription] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [selectedExamSubjectId, setSelectedExamSubjectId] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState('Routine');
    const [selectedEffort, setSelectedEffort] = useState<EffortOption>('1h');
    const [subtasks, setSubtasks] = useState<SubtaskDraft[]>([]);
    const [isRecurring, setIsRecurring] = useState(false);
    // Exam state
    const [entryType, setEntryType] = useState<'task' | 'exam'>('task');
    const [examSubMode, setExamSubMode] = useState<'schedule' | 'result'>('schedule');
    const [examType, setExamType] = useState('Midterm');
    const [obtainedMarks, setObtainedMarks] = useState('');
    const [totalMarks, setTotalMarks] = useState('100');
    const [chapter, setChapter] = useState('');
    const [examLocation, setExamLocation] = useState('');
    const [examDuration, setExamDuration] = useState('120');
    // UI toggles
    const [showManualDetails, setShowManualDetails] = useState(true);
    const [aiSubtaskEnabled, setAiSubtaskEnabled] = useState(false);
    const [isSubmittingNow, setIsSubmittingNow] = useState(false);
    // Parsed date
    const [parsedMeta, setParsedMeta] = useState<{ subject?: string; date?: string; time?: string }>({});
    const [parsedDueDate, setParsedDueDate] = useState<string | null>(null);
    const [hasExplicitDueDate, setHasExplicitDueDate] = useState(false);

    // ── Refs ────────────────────────────────────────────────────────────────
    const hasHydratedFromExistingTask = useRef(false);
    // Prevents the parse-debounce from overwriting a user-chosen date
    const isDueDateManuallyEditedRef = useRef(false);

    // ── RTK mutations & queries ──────────────────────────────────────────────
    const [addGradeEntry, { isLoading: isAddingGrade }] = useAddGradeEntryMutation();
    const [createExam, { isLoading: isCreatingExam }] = useCreateExamMutation();
    const { data: existingTask, isLoading: isLoadingTask } = useGetTaskByIdQuery(taskId || '', { skip: !taskId });
    const [smartCreateTask, { isLoading: isSmartCreating }] = useSmartCreateTaskMutation();
    const [previewSubtasks] = usePreviewSubtasksMutation();
    const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
    const [createSubTask] = useCreateSubTaskMutation();
    const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
    const [createCategory] = useCreateCategoryMutation();
    const [parseTask, { isLoading: isParsingTask }] = useParseTaskMutation();
    const { data: categories } = useGetCategoriesQuery();
    const { data: subjects } = useGetSubjectsQuery();

    // ── Hydrate from existing task on edit ──────────────────────────────────
    useEffect(() => {
        hasHydratedFromExistingTask.current = false;
        isDueDateManuallyEditedRef.current = false;
    }, [taskId]);

    useEffect(() => {
        if (!existingTask || hasHydratedFromExistingTask.current) return;
        hasHydratedFromExistingTask.current = true;

        setTaskDescription(existingTask.title);
        setDescription(existingTask.description || '');

        if (existingTask.priority === PriorityEnum.LOW) setSelectedPriority('Routine');
        else if (existingTask.priority === PriorityEnum.MEDIUM) setSelectedPriority('Medium');
        else if (existingTask.priority === PriorityEnum.HIGH) setSelectedPriority('Urgent');

        if (existingTask.categoryId) setSelectedSubjectId(existingTask.categoryId);
        if (existingTask.effort) setSelectedEffort(normalizeEffortValue(existingTask.effort));

        if (existingTask.subtasks) {
            setSubtasks(existingTask.subtasks.map(s => ({ id: s.id, text: s.title, completed: s.completed })));
        }
        if (existingTask.dueDate) {
            // The stored value is already in "apparent UTC" (e.g. "2026-03-02T15:00:00.000Z"
            // where 15:00 represents the user's chosen local time). Use it directly —
            // re-applying toApparentUtcIso would double-shift the timezone offset.
            setParsedDueDate(existingTask.dueDate);
            setHasExplicitDueDate(true);
        }
        setIsRecurring(Boolean(existingTask.isRecurring));
    }, [existingTask]);

    // ── Memoized chip color ─────────────────────────────────────────────────
    const matchedCategoryForChip = useMemo(
        () => categories?.find(c => c.name.toLowerCase() === parsedMeta.subject?.toLowerCase()),
        [categories, parsedMeta.subject]
    );

    // ── Debounced AI parse ──────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            if (taskDescription.trim().length > 5) {
                try {
                    const result = await parseTask({ text: taskDescription }).unwrap();
                    if (cancelled) return;
                    if (result) {
                        setParsedMeta({
                            subject: result.subject,
                            date: result.dueDate
                                ? new Date(result.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                : undefined,
                            time: result.dueDate
                                ? new Date(result.dueDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                : undefined,
                        });

                        if (result.dueDate && !isDueDateManuallyEditedRef.current) {
                            setParsedDueDate(toApparentUtcIso(new Date(result.dueDate)));
                            setHasExplicitDueDate(true);
                        }

                        if (result.priority === PriorityEnum.LOW) setSelectedPriority('Routine');
                        else if (result.priority === PriorityEnum.MEDIUM) setSelectedPriority('Medium');
                        else if (result.priority === PriorityEnum.HIGH) setSelectedPriority('Urgent');

                        if (result.effort) setSelectedEffort(normalizeEffortValue(result.effort));
                        if (result.isRecurring !== undefined) setIsRecurring(result.isRecurring);

                        if (result.subject && categories) {
                            const matched = categories.find(c => c.name.toLowerCase() === result.subject?.toLowerCase());
                            if (matched) setSelectedSubjectId(matched.id);
                        }
                    }
                } catch (err) {
                    if (cancelled) return;
                    console.error('Failed to parse task description:', err);
                }
            } else {
                if (!cancelled) setParsedMeta({});
            }
        }, 500);

        return () => { cancelled = true; clearTimeout(timer); };
        // isDueDateManuallyEditedRef intentionally omitted — accessed via ref
    }, [taskDescription, parseTask, categories]);

    // ── Date/time helper ────────────────────────────────────────────────────
    const updateDueDateTime = (nextDate: string, nextTime: string, dateUpdated = false) => {
        isDueDateManuallyEditedRef.current = true;
        if (!nextDate && !nextTime) {
            setParsedDueDate(null);
            setHasExplicitDueDate(false);
            return;
        }
        if (dateUpdated) setHasExplicitDueDate(Boolean(nextDate));

        const safeDate = nextDate || new Date().toISOString().slice(0, 10);
        const safeTime = nextTime || '00:00';
        const localD = new Date(`${safeDate}T${safeTime}`);
        if (!isNaN(localD.getTime())) {
            setParsedDueDate(toApparentUtcIso(localD));
        }
    };

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSaveTask = async () => {
        if (isSubmittingNow) return;
        setIsSubmittingNow(true);
        try {
            const shouldUseSmartCreate =
                !taskId && entryType === 'task' && taskDescription.trim().length > 80 && description.trim().length === 0;

            if (shouldUseSmartCreate) {
                const response = await smartCreateTask({ text: taskDescription }).unwrap();
                if (response?.task) {
                    dispatch(addTask(response.task));
                    toast.success('✅ Task created!');
                    if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
                    router.push('/planner');
                    return;
                }
            }

            if (entryType === 'exam') {
                if (!taskDescription) { toast.error('Please enter an exam title or subject'); return; }

                if (examSubMode === 'result') {
                    const marks = parseFloat(obtainedMarks);
                    const total = parseFloat(totalMarks);
                    if (Number.isNaN(marks) || Number.isNaN(total) || total <= 0) {
                        toast.error('Please enter valid marks');
                        return;
                    }
                    await addGradeEntry({
                        examType,
                        subjectName: parsedMeta.subject || taskDescription,
                        chapter: chapter || undefined,
                        obtainedMarks: marks,
                        totalMarks: total,
                    }).unwrap();
                    toast.success('✅ Exam result logged!');
                    router.push('/exam-warroom');
                } else {
                    if (!hasExplicitDueDate || !parsedDueDate) {
                        toast.error('Please specify an exam date');
                        return;
                    }
                    const safeDuration = parseInt(examDuration, 10) || 120;
                    await createExam({
                        title: taskDescription,
                        date: parsedDueDate,
                        durationMinutes: safeDuration,
                        location: examLocation || undefined,
                        subjectName: parsedMeta.subject || taskDescription,
                        subjectId: UUID_REGEX.test(selectedExamSubjectId) ? selectedExamSubjectId : undefined,
                        priority: 'HIGH',
                    }).unwrap();
                    toast.success('🗓️ Exam scheduled!');
                    router.push('/calendar');
                }
                if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
                return;
            }

            let priorityEnum = PriorityEnum.LOW;
            if (selectedPriority === 'Medium') priorityEnum = PriorityEnum.MEDIUM;
            if (selectedPriority === 'Urgent') priorityEnum = PriorityEnum.HIGH;

            let categoryIdToUse = selectedSubjectId || undefined;
            if (parsedMeta.subject) {
                const subject = parsedMeta.subject;
                const existingCategory = categories?.find(c => c.name.toLowerCase() === subject.toLowerCase());
                if (existingCategory) {
                    categoryIdToUse = existingCategory.id;
                } else {
                    try {
                        const newCategory = await createCategory({
                            name: subject,
                            colorCode: 'from-blue-600/40 to-blue-500/40',
                        }).unwrap();
                        categoryIdToUse = newCategory.id;
                    } catch {
                        categoryIdToUse = undefined;
                    }
                }
            }

            if (taskId) {
                await updateTask({
                    id: taskId,
                    title: taskDescription,
                    description,
                    priority: priorityEnum,
                    categoryId: categoryIdToUse,
                    dueDate: parsedDueDate || undefined,
                    isRecurring,
                    effort: selectedEffort,
                }).unwrap();
            } else {
                const createdTask = await createTask({
                    title: taskDescription,
                    description,
                    priority: priorityEnum,
                    status: TaskStatus.PENDING,
                    categoryId: categoryIdToUse,
                    dueDate: parsedDueDate || undefined,
                    isRecurring,
                    effort: selectedEffort,
                }).unwrap();
                if (createdTask) {
                    dispatch(addTask(createdTask));
                    if (createdTask.id && subtasks.length > 0) {
                        await Promise.all(
                            subtasks.map(s => createSubTask({ taskId: createdTask.id, title: s.text }).unwrap())
                        );
                    }
                }
            }

            toast.success(taskId ? '✏️ Task updated!' : '✅ Task created!');
            if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
            router.push('/planner');
        } catch (error: unknown) {
            let errorMsg = 'Failed to save task';
            if (error && typeof error === 'object') {
                const e = error as Record<string, unknown>;
                const data = e.data as Record<string, unknown> | undefined;
                if (typeof data?.message === 'string') errorMsg = data.message;
                else if (typeof e.message === 'string') errorMsg = e.message;
            }
            console.error('Failed to save task:', error);
            toast.error(errorMsg);
        } finally {
            setIsSubmittingNow(false);
        }
    };

    const handleGenerateSubtasks = async () => {
        if (!taskDescription) return;
        try {
            const result = await previewSubtasks({ title: taskDescription }).unwrap();
            setSubtasks(result.subtasks.map((text: string, index: number) => ({
                id: Date.now() + index,
                text,
                completed: false,
            })));
        } catch (err) {
            console.error('Failed to generate subtasks:', err);
        }
    };

    // ── Derived date values (consumed by date inputs) ────────────────────────
    const localDateTimeValue = parsedDueDate ? parsedDueDate.slice(0, 16) : '';
    const dueDateValue = localDateTimeValue.slice(0, 10);
    const dueTimeValue = localDateTimeValue.slice(11, 16);

    const isSubmitting = isSubmittingNow || isCreating || isSmartCreating || isUpdating || isAddingGrade || isCreatingExam;

    return {
        taskDescription, setTaskDescription,
        description, setDescription,
        selectedSubjectId, setSelectedSubjectId,
        selectedPriority, setSelectedPriority,
        selectedEffort, setSelectedEffort,
        subtasks, setSubtasks,
        isRecurring, setIsRecurring,
        showManualDetails, setShowManualDetails,
        aiSubtaskEnabled, setAiSubtaskEnabled,
        entryType, setEntryType,
        examSubMode, setExamSubMode,
        examType, setExamType,
        obtainedMarks, setObtainedMarks,
        totalMarks, setTotalMarks,
        chapter, setChapter,
        examLocation, setExamLocation,
        examDuration, setExamDuration,
        selectedExamSubjectId, setSelectedExamSubjectId,
        parsedMeta,
        parsedDueDate,
        hasExplicitDueDate,
        matchedCategoryForChip,
        dueDateValue,
        dueTimeValue,
        taskId,
        existingTask,
        isLoadingTask,
        categories,
        subjects,
        isSubmitting,
        isParsingTask,
        isSmartCreating,
        handleSaveTask,
        handleGenerateSubtasks,
        updateDueDateTime,
    };
}
