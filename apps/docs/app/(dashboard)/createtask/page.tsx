// app/create-task/page.tsx
'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { TaskInputCard } from '@/components/createtask/TaskInputCard';
import { MetaChips } from '@/components/createtask/MetaChips';
import { Edit, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { toast } from 'sonner';
import {
    useSmartCreateTaskMutation,
    usePreviewSubtasksMutation,
    useCreateTaskMutation,
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
    useAppDispatch
} from '@repo/store';

const EFFORT_OPTIONS = ['30m', '1h', '2h', '4h+'] as const;

const normalizeEffortValue = (value?: string | null): string => {
    if (!value) return '1h';
    const normalized = value.trim().toLowerCase();
    if (normalized === '15m') return '30m';
    if (normalized === '30m') return '30m';
    if (normalized === '1h') return '1h';
    if (normalized === '2h' || normalized === '2h+') return '2h';
    if (normalized === '3h' || normalized === '4h' || normalized === '4h+' || normalized === '5h+') return '4h+';
    return '1h';
};

function CreateTaskPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskId = searchParams.get('id');
    const dispatch = useAppDispatch();

    const [taskDescription, setTaskDescription] = useState('');
    const [description, setDescription] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | number>(1);
    const [selectedExamSubjectId, setSelectedExamSubjectId] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState('Routine');
    const [selectedEffort, setSelectedEffort] = useState('1h');
    const [subtasks, setSubtasks] = useState<{ id: string | number; text: string; completed: boolean; loading?: boolean }[]>([]);
    const [isRecurring, setIsRecurring] = useState<boolean>(false);

    // Exam Mode State
    const [entryType, setEntryType] = useState<'task' | 'exam'>('task');
    const [examSubMode, setExamSubMode] = useState<'schedule' | 'result'>('schedule');
    const [examType, setExamType] = useState('Midterm');
    const [obtainedMarks, setObtainedMarks] = useState('');
    const [totalMarks, setTotalMarks] = useState('100');
    const [chapter, setChapter] = useState('');
    const [examLocation, setExamLocation] = useState('');
    const [examDuration, setExamDuration] = useState('120');
    const [showManualDetails, setShowManualDetails] = useState(true);
    const [aiSubtaskEnabled, setAiSubtaskEnabled] = useState(false);
    const [isSubmittingNow, setIsSubmittingNow] = useState(false);

    const hasHydratedFromExistingTask = useRef(false);
    const parseRequestSeq = useRef(0);
    const isMountedRef = useRef(true);

    const [addGradeEntry, { isLoading: isAddingGrade }] = useAddGradeEntryMutation();
    const [createExam, { isLoading: isCreatingExam }] = useCreateExamMutation();

    const { data: existingTask, isLoading: isLoadingTask } = useGetTaskByIdQuery(taskId || '', {
        skip: !taskId,
    });

    const [smartCreateTask, { isLoading: isSmartCreating }] = useSmartCreateTaskMutation();
    const [previewSubtasks] = usePreviewSubtasksMutation();
    const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
    const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
    const [createCategory] = useCreateCategoryMutation();

    const { data: categories } = useGetCategoriesQuery();
    const { data: subjects } = useGetSubjectsQuery();

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        hasHydratedFromExistingTask.current = false;
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
            setSubtasks(existingTask.subtasks.map(s => ({
                id: s.id,
                text: s.title,
                completed: s.completed
            })));
        }
        if (existingTask.dueDate) {
            const d = new Date(existingTask.dueDate);
            const apparent = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
            setParsedDueDate(apparent);
            setHasExplicitDueDate(true);
        }
        setIsRecurring(Boolean(existingTask.isRecurring));
    }, [existingTask]);

    const [parseTask, { isLoading: isParsingTask }] = useParseTaskMutation();
    const [parsedMeta, setParsedMeta] = useState<{ subject?: string; date?: string; time?: string }>({});
    const [parsedDueDate, setParsedDueDate] = useState<string | null>(null);
    const [hasExplicitDueDate, setHasExplicitDueDate] = useState(false);
    const [isDueDateManuallyEdited, setIsDueDateManuallyEdited] = useState(false);

    // Debounced parsing
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (taskDescription.trim().length > 5) {
                const requestId = ++parseRequestSeq.current;
                try {
                    const result = await parseTask({ text: taskDescription }).unwrap();
                    if (requestId !== parseRequestSeq.current || !isMountedRef.current) return;
                    if (result) {
                        setParsedMeta({
                            subject: result.subject,
                            date: result.dueDate ? new Date(result.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : undefined,
                            time: result.dueDate ? new Date(result.dueDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : undefined
                        });

                        if (result.dueDate) {
                            // Convert real UTC to apparent UTC
                            const d = new Date(result.dueDate);
                            const apparent = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
                            if (!isDueDateManuallyEdited) {
                                setParsedDueDate(apparent);
                                setHasExplicitDueDate(true);
                            }
                        }

                        if (result.priority === PriorityEnum.LOW) setSelectedPriority('Routine');
                        else if (result.priority === PriorityEnum.MEDIUM) setSelectedPriority('Medium');
                        else if (result.priority === PriorityEnum.HIGH) setSelectedPriority('Urgent');

                        if (result.effort) setSelectedEffort(normalizeEffortValue(result.effort));
                        if (result.isRecurring !== undefined) setIsRecurring(result.isRecurring);

                        if (result.subject && categories) {
                            const matchedCategory = categories.find(c => c.name.toLowerCase() === result.subject?.toLowerCase());
                            if (matchedCategory) {
                                setSelectedSubjectId(matchedCategory.id);
                            }
                        }
                    }
                } catch (error) {
                    if (requestId !== parseRequestSeq.current || !isMountedRef.current) return;
                    console.error('Failed to parse task description:', error);
                }
            } else {
                parseRequestSeq.current += 1;
                setParsedMeta({});
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [taskDescription, parseTask, categories, isDueDateManuallyEdited]);

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
                if (!taskDescription) {
                    toast.error('Please enter an exam title or subject');
                    return;
                }

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
                    // Schedule Upcoming Exam
                    if (!hasExplicitDueDate || !parsedDueDate) {
                        toast.error('Please specify an exam date');
                        return;
                    }

                    const duration = parseInt(examDuration);
                    const safeDuration = isNaN(duration) ? 120 : duration;

                    await createExam({
                        title: taskDescription,
                        date: parsedDueDate,
                        durationMinutes: safeDuration,
                        location: examLocation || undefined,
                        subjectName: parsedMeta.subject || taskDescription,
                        subjectId: (typeof selectedExamSubjectId === 'string' && selectedExamSubjectId.length > 5) ? selectedExamSubjectId : undefined,
                        priority: 'HIGH'
                    }).unwrap();

                    toast.success('🗓️ Exam scheduled!');
                    router.push('/calendar');
                }

                if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
                return;
            }


            // Map string priority to Enum
            let priorityEnum = PriorityEnum.LOW;
            if (selectedPriority === 'Medium') priorityEnum = PriorityEnum.MEDIUM;
            if (selectedPriority === 'Urgent') priorityEnum = PriorityEnum.HIGH;

            let categoryIdToUse = typeof selectedSubjectId === 'string' ? selectedSubjectId : undefined;

            // Check if we need to create a new category
            if (parsedMeta.subject) {
                const subject = parsedMeta.subject;
                const existingCategory = categories?.find(c => c.name.toLowerCase() === subject.toLowerCase());

                if (existingCategory) {
                    categoryIdToUse = existingCategory.id;
                } else {
                    // Create new category
                    try {
                        const newCategory = await createCategory({
                            name: subject,
                            colorCode: 'from-blue-600/40 to-blue-500/40', // Default color
                        }).unwrap();
                        categoryIdToUse = newCategory.id;
                    } catch (error) {
                        console.error('Failed to create new category:', error);
                        // Fallback: don't use category if creation failed
                        categoryIdToUse = undefined;
                    }
                }
            } else {
                // If no parsed subject, rely on what's selected visually (if it's a valid string ID)
                // Or if selectedSubjectId is still default 1 (number), map it to undefined
                if (typeof selectedSubjectId === 'number') {
                    categoryIdToUse = undefined;
                }
            }
            if (taskId) {
                await updateTask({
                    id: taskId,
                    title: taskDescription,
                    description: description,
                    priority: priorityEnum,
                    categoryId: categoryIdToUse,
                    dueDate: parsedDueDate || undefined,
                    isRecurring,
                    effort: selectedEffort,
                }).unwrap();
            } else {
                // If the description is long, we might want to use smart create,
                // but for now, we'll use manual create for predictability
                const createdTask = await createTask({
                    title: taskDescription,
                    description: description,
                    priority: priorityEnum,
                    status: TaskStatus.PENDING,
                    categoryId: categoryIdToUse,
                    dueDate: parsedDueDate || undefined,
                    isRecurring,
                    effort: selectedEffort,
                }).unwrap();
                if (createdTask) {
                    dispatch(addTask(createdTask));
                }
            }

            toast.success(taskId ? '✏️ Task updated!' : '✅ Task created!');
            if (window.navigator?.vibrate) window.navigator.vibrate([100, 50, 100]);
            router.push('/planner');
        } catch (error: unknown) {
            const normalized = (err: unknown): { message?: string; data?: unknown; status?: unknown; fullError: unknown } => {
                if (err && typeof err === 'object') {
                    const e = err as Record<string, unknown>;
                    return {
                        message: typeof e.message === 'string' ? (e.message as string) : undefined,
                        data: e.data,
                        status: e.status,
                        fullError: err,
                    };
                }
                return { fullError: err };
            };

            const info = normalized(error);
            console.error('Failed to save task:', info);

            let dataMessage: string | undefined;
            if (info.data && typeof info.data === 'object') {
                const d = info.data as Record<string, unknown>;
                if (typeof d.message === 'string') dataMessage = d.message;
            }

            const errorMsg = dataMessage || info.message || 'Failed to save task';
            toast.error(errorMsg);
        } finally {
            if (isMountedRef.current) {
                setIsSubmittingNow(false);
            }
        }
    };
    const handleGenerateSubtasks = async () => {
        if (!taskDescription) return;
        try {
            const result = await previewSubtasks({ title: taskDescription }).unwrap();
            const newSubtasks = result.subtasks.map((text: string, index: number) => ({
                id: Date.now() + index,
                text,
                completed: false
            }));
            setSubtasks(newSubtasks);
        } catch (error) {
            console.error('Failed to generate subtasks:', error);
        }
    };

    if (taskId && isLoadingTask) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    const localDateTimeValue = parsedDueDate ? parsedDueDate.slice(0, 16) : '';
    const dueDateValue = localDateTimeValue ? localDateTimeValue.slice(0, 10) : '';
    const dueTimeValue = localDateTimeValue ? localDateTimeValue.slice(11, 16) : '';

    const updateDueDateTime = (nextDate: string, nextTime: string, dateUpdated = false) => {
        setIsDueDateManuallyEdited(true);
        if (!nextDate && !nextTime) {
            setParsedDueDate(null);
            setHasExplicitDueDate(false);
            return;
        }
        if (dateUpdated) {
            setHasExplicitDueDate(Boolean(nextDate));
        }
        // Use local system date if none provided, but formatted as YYYY-MM-DD.
        // This lets the time picker update immediately even before a date is chosen.
        const safeDate = nextDate || new Date().toISOString().slice(0, 10);
        const safeTime = nextTime || '00:00';

        // Create a local Date object and shift it to "Apparent UTC"
        const localD = new Date(`${safeDate}T${safeTime}`);
        if (!isNaN(localD.getTime())) {
            const apparent = new Date(localD.getTime() - localD.getTimezoneOffset() * 60000);
            setParsedDueDate(apparent.toISOString());
        }
    };

    const isSubmitting = isSubmittingNow || isCreating || isSmartCreating || isUpdating || isAddingGrade || isCreatingExam;

    return (
        <div className="min-h-screen bg-slate-950 text-white relative overflow-x-hidden selection:bg-purple-500/30 md:pt-3">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/12 rounded-full blur-[140px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/12 rounded-full blur-[140px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-pink-600/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-2 md:px-8 md:py-4 pb-20 space-y-4 ">
                <div className="flex flex-col items-center justify-center space-y-3 pt-0 md:pt-2">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center space-y-3"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-indigo-300 text-transparent bg-clip-text tracking-tight">
                            What would you like to capture?
                        </h1>
                        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                            Add a focused task or log an exam result in under a minute.
                        </p>
                    </motion.div>

                    {!taskId && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-full max-w-md"
                        >
                            <div
                                role="tablist"
                                aria-label="Create mode"
                                className="grid grid-cols-2 p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-purple-500/10"
                            >
                                {[
                                    { id: 'task', label: 'New Task', icon: Edit },
                                    { id: 'exam', label: 'Exam Mode', icon: GraduationCap }
                                ].map((mode) => {
                                    const isActive = entryType === mode.id;
                                    return (
                                        <button
                                            key={mode.id}
                                            role="tab"
                                            aria-selected={isActive}
                                            onClick={() => setEntryType(mode.id as 'task' | 'exam')}
                                            className={`relative flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="active-mode"
                                                    className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-xl shadow-xl shadow-purple-500/30"
                                                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                                />
                                            )}
                                            <mode.icon className="w-4 h-4 relative z-10" />
                                            <span className="relative z-10">{mode.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="max-w-4xl mx-auto w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={entryType}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="panel-surface rounded-4xl p-6 md:p-8 space-y-3"
                        >
                            <div className="space-y-3">
                                <p className="text-[11px] tracking-[0.18em] font-semibold text-purple-300/90 uppercase">
                                    {entryType === 'task' ? 'Task Summary' : 'Exam Title / Subject'}
                                </p>
                                <TaskInputCard
                                    value={taskDescription}
                                    onChange={setTaskDescription}
                                    isParsing={isSmartCreating || isParsingTask}
                                    highlights={[
                                        ...(parsedMeta.subject ? [{ text: parsedMeta.subject, type: 'subject' as const }] : []),
                                        ...(parsedMeta.date ? [{ text: parsedMeta.date, type: 'date' as const }] : []),
                                        ...(parsedMeta.time ? [{ text: parsedMeta.time, type: 'time' as const }] : []),
                                    ]}
                                />
                                {(() => {
                                    const matchedCategory = categories?.find(c => c.name.toLowerCase() === parsedMeta.subject?.toLowerCase());
                                    return (
                                        <MetaChips
                                            subject={parsedMeta.subject}
                                            date={parsedMeta.date}
                                            time={parsedMeta.time}
                                            subjectColor={matchedCategory?.colorCode}
                                        />
                                    );
                                })()}
                            </div>

                            {entryType === 'task' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Subject</Label>
                                            <select
                                                value={selectedSubjectId ? String(selectedSubjectId) : ''}
                                                onChange={(e) => setSelectedSubjectId(e.target.value)}
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                                            >
                                                <option value="">Select subject</option>
                                                {categories?.map((c) => (
                                                    <option key={c.id} value={String(c.id)} className="text-black">{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Priority</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['Routine', 'Medium', 'Urgent'].map((priority) => (
                                                    <button
                                                        key={priority}
                                                        type="button"
                                                        onClick={() => setSelectedPriority(priority)}
                                                        className={`h-12 rounded-xl text-xs font-semibold border transition-all ${selectedPriority === priority
                                                            ? 'bg-indigo-500/30 border-indigo-400/50 text-white'
                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {priority}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Effort</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {EFFORT_OPTIONS.map((effort) => (
                                                    <button
                                                        key={effort}
                                                        type="button"
                                                        onClick={() => setSelectedEffort(effort)}
                                                        className={`h-12 rounded-xl text-xs font-semibold border transition-all ${selectedEffort === effort
                                                            ? 'bg-indigo-500/30 border-indigo-400/50 text-white'
                                                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {effort}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-4 space-y-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowManualDetails((prev) => !prev)}
                                            className="text-sm text-slate-300 hover:text-white transition-colors"
                                        >
                                            {showManualDetails ? '▾' : '▸'} Manual Overrides & Details
                                        </button>

                                        {showManualDetails && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2 md:col-span-1">
                                                    <Label htmlFor="description" className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Detailed Description</Label>
                                                    <textarea
                                                        id="description"
                                                        value={description}
                                                        onChange={(e) => setDescription(e.target.value)}
                                                        placeholder="Add specific instructions, links, or notes..."
                                                        className="w-full min-h-[88px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                                                    />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Due Date</Label>
                                                            <Input
                                                                type="date"
                                                                value={dueDateValue}
                                                                onChange={(e) => updateDueDateTime(e.target.value, dueTimeValue, true)}
                                                                className="h-12 bg-white/5 border-white/10"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Time</Label>
                                                            <TimePickerInput
                                                                value={dueTimeValue}
                                                                onChange={(nextTime) => updateDueDateTime(dueDateValue, nextTime)}
                                                                className="h-12 bg-white/5 border-white/10 text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsRecurring(!isRecurring)}
                                                            className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between text-sm transition-all hover:bg-white/10"
                                                        >
                                                            <span className="text-slate-200">Recurring Task</span>
                                                            <span className={`inline-flex h-6 w-10 rounded-full p-1 transition-colors ${isRecurring ? 'bg-purple-500/70' : 'bg-white/20'}`}>
                                                                <span className={`h-4 w-4 rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
                                                            </span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                const next = !aiSubtaskEnabled;
                                                                setAiSubtaskEnabled(next);
                                                                if (next) await handleGenerateSubtasks();
                                                            }}
                                                            className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between text-sm transition-all hover:bg-white/10"
                                                        >
                                                            <span className="text-slate-200">AI Subtask Generator</span>
                                                            <span className={`inline-flex h-6 w-10 rounded-full p-1 transition-colors ${aiSubtaskEnabled ? 'bg-indigo-500/70' : 'bg-white/20'}`}>
                                                                <span className={`h-4 w-4 rounded-full bg-white transition-transform ${aiSubtaskEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {aiSubtaskEnabled && subtasks.length > 0 && (
                                            <div className="space-y-2">
                                                {subtasks.map((subtask) => (
                                                    <label key={subtask.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={subtask.completed}
                                                            onChange={() => setSubtasks((prev) => prev.map((t) => t.id === subtask.id ? { ...t, completed: !t.completed } : t))}
                                                        />
                                                        <span className={subtask.completed ? 'line-through text-slate-400' : 'text-slate-200'}>{subtask.text}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4 border-t border-white/10 pt-4">
                                    <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 mb-2">
                                        {[
                                            { id: 'schedule', label: 'Schedule Exam' },
                                            { id: 'result', label: 'Log Result' }
                                        ].map((sub) => (
                                            <button
                                                key={sub.id}
                                                type="button"
                                                onClick={() => setExamSubMode(sub.id as 'schedule' | 'result')}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${examSubMode === sub.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                                            >
                                                {sub.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Subject (Optional)</Label>
                                        <select
                                            value={selectedExamSubjectId}
                                            onChange={(e) => setSelectedExamSubjectId(e.target.value)}
                                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                                        >
                                            <option value="">Select subject</option>
                                            {subjects?.map((s) => (
                                                <option key={s.id} value={String(s.id)} className="text-black">{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {examSubMode === 'result' ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Exam Type</Label>
                                                <select
                                                    value={examType}
                                                    onChange={(e) => setExamType(e.target.value)}
                                                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                                                >
                                                    <option value="Midterm">Midterm</option>
                                                    <option value="Final">Final</option>
                                                    <option value="Quiz">Quiz</option>
                                                    <option value="Assignment">Assignment</option>
                                                    <option value="UnitTest">Unit Test</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Chapter (Optional)</Label>
                                                <Input
                                                    value={chapter}
                                                    onChange={(e) => setChapter(e.target.value)}
                                                    placeholder="e.g. Thermodynamics"
                                                    className="bg-white/5 border-white/10 h-12"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Marks (Obtained / Total)</Label>
                                                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                                                    <Input
                                                        type="number"
                                                        value={obtainedMarks}
                                                        onChange={(e) => setObtainedMarks(e.target.value)}
                                                        placeholder="85"
                                                        className="bg-white/5 border-white/10 h-12"
                                                    />
                                                    <span className="text-slate-400">/</span>
                                                    <Input
                                                        type="number"
                                                        value={totalMarks}
                                                        onChange={(e) => setTotalMarks(e.target.value)}
                                                        placeholder="100"
                                                        className="bg-white/5 border-white/10 h-12"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Exam Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={dueDateValue}
                                                        onChange={(e) => updateDueDateTime(e.target.value, dueTimeValue, true)}
                                                        className="h-12 bg-white/5 border-white/10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Time</Label>
                                                    <TimePickerInput
                                                        value={dueTimeValue}
                                                        onChange={(nextTime) => updateDueDateTime(dueDateValue, nextTime)}
                                                        className="h-12 bg-white/5 border-white/10 text-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Location</Label>
                                                    <Input
                                                        value={examLocation}
                                                        onChange={(e) => setExamLocation(e.target.value)}
                                                        placeholder="e.g. Hall A"
                                                        className="bg-white/5 border-white/10 h-12"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Duration (Mins)</Label>
                                                    <Input
                                                        type="number"
                                                        value={examDuration}
                                                        onChange={(e) => setExamDuration(e.target.value)}
                                                        placeholder="180"
                                                        className="bg-white/5 border-white/10 h-12"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveTask}
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : (taskId ? 'Update Task' : (entryType === 'exam' ? (examSubMode === 'result' ? 'Log Result' : 'Schedule Exam') : 'Create Task'))}
                                </button>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default function CreateTaskPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        }>
            <CreateTaskPageContent />
        </Suspense>
    );
}
