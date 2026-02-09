// app/create-task/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TaskInputCard } from '@/components/createtask/TaskInputCard';
import { MetaChips } from '@/components/createtask/MetaChips';
import { SubjectSelector } from '@/components/createtask/SubjectSelector';
import { PrioritySelector } from '@/components/createtask/PrioritySelector';
import { EffortSelector } from '@/components/createtask/EffortSelector';
import { AISubtaskPanel } from '@/components/createtask/AiSubTaskPanel';
import { PageActions } from '@/components/createtask/PageAction';
import { Edit, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    useAppDispatch
} from '@repo/store';

function CreateTaskPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskId = searchParams.get('id');

    const [taskDescription, setTaskDescription] = useState('');
    const [description, setDescription] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | number>(1);
    const [selectedPriority, setSelectedPriority] = useState('Routine');
    const [selectedEffort, setSelectedEffort] = useState('1h');
    const [subtasks, setSubtasks] = useState<{ id: string | number; text: string; completed: boolean; loading?: boolean }[]>([]);

    const { data: existingTask, isLoading: isLoadingTask } = useGetTaskByIdQuery(taskId || '', {
        skip: !taskId,
    });

    const [smartCreateTask, { isLoading: isSmartCreating }] = useSmartCreateTaskMutation();
    const [previewSubtasks, { isLoading: isGeneratingSubtasks }] = usePreviewSubtasksMutation();
    const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
    const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
    const [createCategory] = useCreateCategoryMutation(); // Initialize category mutation

    const { data: categories } = useGetCategoriesQuery();
    useEffect(() => {
        if (existingTask) {
            setTaskDescription(existingTask.title);
            setDescription(existingTask.description || '');
            // Map priority
            if (existingTask.priority === PriorityEnum.LOW) setSelectedPriority('Routine');
            else if (existingTask.priority === PriorityEnum.MEDIUM) setSelectedPriority('Medium');
            else if (existingTask.priority === PriorityEnum.HIGH) setSelectedPriority('Urgent');

            if (existingTask.categoryId) setSelectedSubjectId(existingTask.categoryId);

            // Set subtasks if they exist
            if (existingTask.subtasks) {
                setSubtasks(existingTask.subtasks.map(s => ({
                    id: s.id,
                    text: s.title,
                    completed: s.completed
                })));
            }
        }
    }, [existingTask]);

    const [parseTask, { isLoading: isParsingTask }] = useParseTaskMutation();
    const [parsedMeta, setParsedMeta] = useState<{ subject?: string; date?: string; time?: string }>({});
    const [parsedDueDate, setParsedDueDate] = useState<string | null>(null);

    // Debounced parsing
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (taskDescription.trim().length > 5) {
                try {
                    const result = await parseTask({ text: taskDescription }).unwrap();
                    if (result) {
                        setParsedMeta({
                            subject: result.subject,
                            date: result.dueDate ? new Date(result.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : undefined,
                            time: result.dueDate ? new Date(result.dueDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : undefined
                        });

                        // Only auto-update date if AI found one
                        if (result.dueDate) {
                            setParsedDueDate(result.dueDate);
                        }

                        // Auto-select priority if parsed
                        if (result.priority === PriorityEnum.LOW) setSelectedPriority('Routine');
                        else if (result.priority === PriorityEnum.MEDIUM) setSelectedPriority('Medium');
                        else if (result.priority === PriorityEnum.HIGH) setSelectedPriority('Urgent');

                        // Auto-select effort if parsed
                        if (result.effort) setSelectedEffort(result.effort);

                        // If subject matches an existing category, select it
                        if (result.subject && categories) {
                            const matchedCategory = categories.find(c => c.name.toLowerCase() === result.subject?.toLowerCase());
                            if (matchedCategory) {
                                setSelectedSubjectId(matchedCategory.id);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to parse task description:', error);
                }
            } else {
                setParsedMeta({});
                // Don't clear manually set due date even if title is short
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [taskDescription, parseTask, categories]);

    const handleSaveTask = async () => {
        try {


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
                        console.log('Created new category:', newCategory);
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
            console.log("title", taskDescription);
            console.log("description", description);
            console.log("priority", priorityEnum);
            console.log("categoryId", categoryIdToUse);
            console.log("dueDate", parsedDueDate);

            if (taskId) {
                await updateTask({
                    id: taskId,
                    title: taskDescription,
                    description: description,
                    priority: priorityEnum,
                    categoryId: categoryIdToUse,
                    dueDate: parsedDueDate || undefined,
                }).unwrap();
            } else {
                // If the description is long, we might want to use smart create,
                // but for now, we'll use manual create for predictability
                await createTask({
                    title: taskDescription,
                    description: description,
                    priority: priorityEnum,
                    categoryId: categoryIdToUse,
                    dueDate: parsedDueDate || undefined,
                }).unwrap();
            }

            router.push('/planner');
        } catch (error) {
            console.error('Failed to save task:', error);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>

            <div className="relative max-w-6xl mx-auto p-6 md:p-12 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="text-white text-2xl font-bold text-center">Create New Task</div>
                        <div>
                            <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4">
                                {taskId ? 'EDITING TASK' : "WHAT'S ON YOUR MIND?"}
                            </h2>
                            <TaskInputCard
                                value={taskDescription}
                                onChange={setTaskDescription}
                                isParsing={isSmartCreating || isParsingTask}
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

                        <SubjectSelector
                            selectedSubjectId={selectedSubjectId}
                            onSelect={setSelectedSubjectId}
                            categories={categories}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PrioritySelector
                                selectedPriority={selectedPriority}
                                onSelect={setSelectedPriority}
                            />
                            <EffortSelector
                                selectedEffort={selectedEffort}
                                onSelect={setSelectedEffort}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Edit className="w-3 h-3" />
                                Manual Details
                            </h3>
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-xs font-medium text-slate-400">Description</Label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add more details..."
                                        className="w-full min-h-[100px] pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dueDate" className="text-xs font-medium text-slate-400">Due Date</Label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        id="dueDate"
                                        type="datetime-local"
                                        value={parsedDueDate ? new Date(new Date(parsedDueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setParsedDueDate(e.target.value ? new Date(e.target.value).toISOString() : null)}
                                        className="pl-10 bg-white/5 border-white/10 text-white h-11 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        <AISubtaskPanel
                            subtasks={subtasks}
                            onSubtaskToggle={(id) => setSubtasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))}
                            isLoading={isGeneratingSubtasks}
                            onGenerate={handleGenerateSubtasks}
                        />

                    </div>
                </div>

                <PageActions
                    onSubmit={handleSaveTask}
                    onCancel={() => router.back()}
                    isSubmitting={isCreating || isSmartCreating || isUpdating}
                    submitLabel={taskId ? "Update Task" : "Add to My Gateway"}
                    SubmitIcon={taskId ? Edit : undefined}
                />
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