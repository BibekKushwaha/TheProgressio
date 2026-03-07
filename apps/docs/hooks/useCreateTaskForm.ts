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
import { EFFORT_OPTIONS } from '@repo/schemas/task';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type EffortOption = (typeof EFFORT_OPTIONS)[number];
export type EditableField = 'priority' | 'effort' | 'recurring' | 'subject';
export type ParseConfidence = 'idle' | 'parsing' | 'high' | 'low' | 'none';

/**
 * Shift a local Date object to "apparent UTC" so the backend stores the number
 * the user typed, not the true UTC equivalent.
 * e.g. user picks 15:00 in UTC+5:30 → stored as "2026-03-02T15:00:00.000Z"
 */
export const toApparentUtcIso = (d: Date): string => {
    const apparent = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return apparent.toISOString();
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
    setExamSubMode: (v: 'schedule' | 'result') => void; // clears related validation errors
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
    // validation & confidence
    validationErrors: Record<string, string>;
    clearValidationError: (field: string) => void;
    parseConfidence: ParseConfidence;
    useSmartCreate: boolean;
    setUseSmartCreate: (v: boolean) => void;
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
    const mode = searchParams.get('mode');
    const title = searchParams.get('title');
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
    const [useSmartCreate, setUseSmartCreate] = useState(false);
    // Parsed date
    const [parsedMeta, setParsedMeta] = useState<{ subject?: string; date?: string; time?: string }>({});
    const [parsedDueDate, setParsedDueDate] = useState<string | null>(null);
    const [hasExplicitDueDate, setHasExplicitDueDate] = useState(false);
    // Validation & confidence
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [parseConfidence, setParseConfidence] = useState<ParseConfidence>('idle');

    // ── Refs ────────────────────────────────────────────────────────────────
    const hasHydratedFromExistingTask = useRef(false);
    // Prevents the parse-debounce from overwriting a user-chosen date
    const isDueDateManuallyEditedRef = useRef(false);
    // Tracks which fields user has manually edited — AI parse will skip these
    const manuallyEditedFieldsRef = useRef(new Set<EditableField>());

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

    // ── Wrapped setters – mark fields as user-edited ────────────────────────
    const handleSetPriority = (v: string) => {
        manuallyEditedFieldsRef.current.add('priority');
        setSelectedPriority(v);
        clearValidationError('priority');
    };
    const handleSetEffort = (v: EffortOption) => {
        manuallyEditedFieldsRef.current.add('effort');
        setSelectedEffort(v);
    };
    const handleSetRecurring = (v: boolean) => {
        manuallyEditedFieldsRef.current.add('recurring');
        setIsRecurring(v);
    };
    const handleSetSubjectId = (v: string) => {
        manuallyEditedFieldsRef.current.add('subject');
        setSelectedSubjectId(v);
        clearValidationError('subject');
    };
    const handleSetTaskDescription = (v: string) => {
        setTaskDescription(v);
        clearValidationError('title');
    };
    const handleSetExamSubMode = (v: 'schedule' | 'result') => {
        setExamSubMode(v);
        // Clear errors that belong to the mode being left
        setValidationErrors(prev => {
            const next = { ...prev };
            if (v === 'schedule') {
                delete next.obtainedMarks;
                delete next.totalMarks;
            } else {
                delete next.dueDate;
            }
            return next;
        });
    };

    // ── Validation helpers ──────────────────────────────────────────────────
    const clearValidationError = (field: string) => {
        setValidationErrors(prev => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!taskDescription.trim()) errors.title = 'Task title is required';
        else if (taskDescription.trim().length > 100) errors.title = 'Title must be under 100 characters';

        if (entryType === 'exam') {
            if (examSubMode === 'result') {
                const marks = parseFloat(obtainedMarks);
                const total = parseFloat(totalMarks);
                if (Number.isNaN(marks) || marks < 0) errors.obtainedMarks = 'Enter valid marks';
                if (Number.isNaN(total) || total <= 0) errors.totalMarks = 'Enter valid total';
            } else if (!hasExplicitDueDate) {
                errors.dueDate = 'Please pick an exam date';
            }
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ── Hydrate from existing task on edit ──────────────────────────────────
    useEffect(() => {
        hasHydratedFromExistingTask.current = false;
        isDueDateManuallyEditedRef.current = false;
        manuallyEditedFieldsRef.current.clear();
    }, [taskId]);

    useEffect(() => {
        if (taskId) return;
        if (mode === 'exam') setEntryType('exam');
        if (mode === 'task') setEntryType('task');
    }, [mode, taskId]);

    useEffect(() => {
        if (taskId) return;
        if (!title) return;
        setTaskDescription((current) => current || title);
    }, [title, taskId]);

    useEffect(() => {
        if (!existingTask || hasHydratedFromExistingTask.current) return;
        hasHydratedFromExistingTask.current = true;

        setTaskDescription(existingTask.title);
        setDescription(existingTask.description || '');

        if (existingTask.priority === PriorityEnum.LOW) setSelectedPriority('Routine');
        else if (existingTask.priority === PriorityEnum.MEDIUM) setSelectedPriority('Medium');
        else if (existingTask.priority === PriorityEnum.HIGH) setSelectedPriority('Urgent');

        if (existingTask.categoryId) setSelectedSubjectId(existingTask.categoryId);
        if (existingTask.effort && EFFORT_OPTIONS.includes(existingTask.effort as EffortOption)) {
            setSelectedEffort(existingTask.effort as EffortOption);
        }

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
        const edited = manuallyEditedFieldsRef.current;
        const timer = setTimeout(async () => {
            if (taskDescription.trim().length > 5) {
                setParseConfidence('parsing');
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

                        // Only set fields the user hasn't manually edited
                        if (!edited.has('priority')) {
                            if (result.priority === PriorityEnum.LOW) setSelectedPriority('Routine');
                            else if (result.priority === PriorityEnum.MEDIUM) setSelectedPriority('Medium');
                            else if (result.priority === PriorityEnum.HIGH) setSelectedPriority('Urgent');
                        }

                        if (!edited.has('effort')) {
                            if (result.effort && EFFORT_OPTIONS.includes(result.effort as EffortOption)) {
                                setSelectedEffort(result.effort as EffortOption);
                            }
                        }

                        if (!edited.has('recurring')) {
                            if (result.isRecurring !== undefined) setIsRecurring(result.isRecurring);
                        }

                        if (!edited.has('subject')) {
                            if (result.subject && categories) {
                                const matched = categories.find(c => c.name.toLowerCase() === result.subject?.toLowerCase());
                                if (matched) setSelectedSubjectId(matched.id);
                            }
                        }

                        // Compute parse confidence from filled fields
                        const filledFields = [result.subject, result.dueDate, result.priority, result.effort].filter(Boolean).length;
                        setParseConfidence(filledFields >= 2 ? 'high' : filledFields >= 1 ? 'low' : 'none');
                    } else {
                        setParseConfidence('none');
                    }
                } catch (err) {
                    if (cancelled) return;
                    console.error('Failed to parse task description:', err);
                    setParseConfidence('none');
                }
            } else {
                if (!cancelled) {
                    setParsedMeta({});
                    setParseConfidence('idle');
                }
            }
        }, 500);

        return () => { cancelled = true; clearTimeout(timer); };
        // manuallyEditedFieldsRef & isDueDateManuallyEditedRef intentionally omitted — accessed via ref
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
        if (!validateForm()) return;
        setIsSubmittingNow(true);
        try {
            // Explicit smart-create toggle (replaces hidden 80-char heuristic)
            if (!taskId && useSmartCreate && entryType === 'task') {
                const response = await smartCreateTask({ text: taskDescription }).unwrap();
                if (response?.task) {
                    dispatch(addTask(response.task));
                    const titlePreview = taskDescription.slice(0, 40) + (taskDescription.length > 40 ? '…' : '');
                    toast.success('Task created!', {
                        description: `"${titlePreview}" added to your planner`,
                        action: { label: 'View Planner', onClick: () => router.push('/planner') },
                    });
                    if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
                    router.push('/planner');
                    return;
                }
                // AI returned no structured task — fall through to regular create
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
                    toast.success('Exam result logged!', {
                        description: `${obtainedMarks}/${totalMarks} recorded for ${parsedMeta.subject || taskDescription}`,
                        action: { label: 'View War Room', onClick: () => router.push('/exam-warroom') },
                    });
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
                    toast.success('Exam scheduled!', {
                        description: `"${taskDescription.slice(0, 40)}${taskDescription.length > 40 ? '…' : ''}" is on the calendar`,
                        action: { label: 'View Calendar', onClick: () => router.push('/calendar') },
                    });
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

            const titlePreview = taskDescription.slice(0, 40) + (taskDescription.length > 40 ? '…' : '');
            if (taskId) {
                toast.success('Task updated!', {
                    description: `"${titlePreview}" has been saved`,
                    action: { label: 'View Planner', onClick: () => router.push('/planner') },
                });
            } else {
                toast.success('Task created!', {
                    description: `"${titlePreview}" added to your planner${subtasks.length ? ` with ${subtasks.length} subtask${subtasks.length > 1 ? 's' : ''}` : ''}`,
                    action: { label: 'View Planner', onClick: () => router.push('/planner') },
                });
            }
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
        taskDescription, setTaskDescription: handleSetTaskDescription,
        description, setDescription,
        selectedSubjectId, setSelectedSubjectId: handleSetSubjectId,
        selectedPriority, setSelectedPriority: handleSetPriority,
        selectedEffort, setSelectedEffort: handleSetEffort,
        subtasks, setSubtasks,
        isRecurring, setIsRecurring: handleSetRecurring,
        showManualDetails, setShowManualDetails,
        aiSubtaskEnabled, setAiSubtaskEnabled,
        entryType, setEntryType,
        examSubMode, setExamSubMode: handleSetExamSubMode,
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
        validationErrors,
        clearValidationError,
        parseConfidence,
        useSmartCreate,
        setUseSmartCreate,
        isSubmitting,
        isParsingTask,
        isSmartCreating,
        handleSaveTask,
        handleGenerateSubtasks,
        updateDueDateTime,
    };
}
