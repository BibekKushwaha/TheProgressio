"use client"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useAppDispatch, useCreateTaskMutation, useUpdateTaskMutation, useSmartCreateTaskMutation, useCreateCategoryMutation, useGetCategoriesQuery, PriorityEnum, addCategory, addTask, updateTask as updateTaskAction, type Priority, type Task, type Status } from "@repo/store"
import { categorySchema, taskSchema } from "@repo/schemas"

interface TaskDialogProps {
    onClose: () => void;
    onSubmit: () => Promise<void>;
    task?: Task | null;
}

const CATEGORY_OPTIONS = [
    { label: "Personal", value: "personal", color: "#A855F7" },
    { label: "Studies", value: "studies", color: "#3B82F6", },
    { label: "Fitness", value: "fitness", color: "#22C55E" },
    { label: "Coding", value: "coding", color: "#F97316" },
] as const;

export function TaskDialog({ onClose, onSubmit, task }: TaskDialogProps) {
    const isEdit = !!task;
    const [taskName, setTaskName] = useState(task?.title || '');
    const [description, setDescription] = useState<string>(task?.description ? task.description : "");
    const [categoryName, setCategoryName] = useState(task?.category?.name || '');
    const [dueDate, setDueDate] = useState<string>(
        (task?.dueDate
            ? new Date(task.dueDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]) || ""
    );
    const [priority, setPriority] = useState<Priority>(task?.priority || PriorityEnum.MEDIUM);
    const [isRecurring, setIsRecurring] = useState<boolean>(task?.isRecurring ?? false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});

    const dispatch = useAppDispatch();
    const [createTaskApi] = useCreateTaskMutation();
    const [updateTaskApi] = useUpdateTaskMutation();
    const [smartCreateTaskApi] = useSmartCreateTaskMutation();
    const [createCategoryApi] = useCreateCategoryMutation();

    const [mode, setMode] = useState<'manual' | 'smart'>('manual');
    const [smartInput, setSmartInput] = useState('');
    const { data: categories } = useGetCategoriesQuery();

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            if (mode === 'smart') {
                if (!smartInput.trim()) {
                    setErrors({ smart: 'Please enter a task description' });
                    setIsLoading(false);
                    return;
                }

                try {
                    const response = await smartCreateTaskApi({ text: smartInput }).unwrap();
                    if (response.task) {
                        dispatch(addTask(response.task));
                        await onSubmit();
                        onClose();
                    }
                } catch (err: unknown) {
                    const message =
                        typeof err === 'object' && err !== null && 'data' in err
                            ? (err as { data?: { message?: string } }).data?.message
                            : undefined;
                    setErrors({ smart: message || 'Failed to create smart task' });
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            // Find or create category
            const catColor = CATEGORY_OPTIONS.find(c => c.label.toLowerCase() === categoryName.toLowerCase())?.color || '#6B7280';
            const existingCategory = categories?.find(c => c.name.toLowerCase() === categoryName.trim().toLowerCase());

            let categoryId = existingCategory?.id;

            if (!existingCategory && categoryName.trim()) {
                const validatedCategory = categorySchema.safeParse({ name: categoryName.trim(), colorCode: catColor });
                if (validatedCategory.success) {
                    try {
                        const catResp = await createCategoryApi({ name: validatedCategory.data.name, colorCode: validatedCategory.data.colorCode }).unwrap();
                        if (catResp.id) {
                            dispatch(addCategory(catResp));
                            categoryId = catResp.id;
                        }
                    } catch {
                        setErrors(prev => ({ ...prev, category: 'Failed to create category' }));
                        setIsLoading(false);
                        return;
                    }
                }
            }

            const validationResult = taskSchema.safeParse({
                title: taskName.trim(),
                description: description.trim() || undefined,
                dueDate: new Date(dueDate),
                isRecurring,
                categoryId: categoryId || undefined,
                priority: priority,
            });

            if (!validationResult.success) {
                const fieldErrors: Record<string, string | undefined> = {};
                validationResult.error.issues.forEach((err) => {
                    if (err.path[0]) {
                        fieldErrors[err.path[0].toString()] = err.message;
                    }
                });
                setErrors(fieldErrors);
                setIsLoading(false);
                return;
            }

            if (isEdit && task) {
                const response = await updateTaskApi({
                    id: task.id,
                    ...validationResult.data,
                    status: validationResult.data.status as Status,
                    priority: validationResult.data.priority as Priority,
                    dueDate: validationResult.data.dueDate?.toISOString(),
                }).unwrap();
                dispatch(updateTaskAction(response));
            } else {
                const response = await createTaskApi({
                    ...validationResult.data,
                    priority: validationResult.data.priority as Priority,
                    status: validationResult.data.status as Status,
                    dueDate: validationResult.data.dueDate?.toISOString(),
                }).unwrap();
                dispatch(addTask(response));
            }

            await onSubmit(); // Notify parent
            onClose();
        } catch (error: unknown) {
            const message =
                typeof error === 'object' && error !== null && 'data' in error
                    ? (error as { data?: { message?: string } }).data?.message
                    : undefined;
            setErrors(prev => ({ ...prev, form: message || `Failed to ${isEdit ? 'update' : 'create'} task` }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-slate-900 text-white border-white/10">
                <form onSubmit={handleFormSubmit}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {isEdit ? 'Edit Task' : 'New Task'}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {isEdit ? 'Update your task details.' : 'Add a new task to your planner.'}
                        </DialogDescription>

                        {!isEdit && (
                            <div className="flex gap-2 mt-4 bg-white/5 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setMode('manual')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'manual' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    Manual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('smart')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'smart' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    ✨ Smart AI
                                </button>
                            </div>
                        )}
                    </DialogHeader>

                    {mode === 'smart' ? (
                        <div className="py-6 space-y-4">
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                <p className="text-xs text-purple-200">
                                    <strong>Tip:</strong> Try &quot;Physics exam next Friday at 2pm&quot; or &quot;Buy groceries tomorrow high priority&quot;
                                </p>
                            </div>
                            <Field>
                                <Label htmlFor="smartInput">What&apos;s on your mind?</Label>
                                <textarea
                                    id="smartInput"
                                    value={smartInput}
                                    onChange={(e) => setSmartInput(e.target.value)}
                                    placeholder="Describe your task naturally..."
                                    className="flex min-h-[120px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium"
                                    autoFocus
                                />
                                {errors.smart && <p className="text-red-400 text-xs mt-1">{errors.smart}</p>}
                            </Field>
                        </div>
                    ) : (
                        <FieldGroup className="py-4">
                            <Field>
                                <Label htmlFor="taskName">Task Name</Label>
                                <Input
                                    id="taskName"
                                    value={taskName}
                                    onChange={(e) => setTaskName(e.target.value)}
                                    placeholder="What needs to be done?"
                                    className="bg-white/5 border-white/10 focus:ring-purple-500/50"
                                    required
                                />
                                {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
                            </Field>

                            <Field>
                                <Label htmlFor="description">Description (Optional)</Label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add more details..."
                                    className="flex min-h-[80px] w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                />
                                {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
                            </Field>

                            <Field>
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="bg-white/5 border-white/10 focus:ring-purple-500/50"
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <Label htmlFor="categoryName">Category</Label>
                                    <select
                                        id="categoryName"
                                        value={categoryName}
                                        onChange={(e) => setCategoryName(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value="">Select Category</option>
                                        {CATEGORY_OPTIONS.map((cat) => (
                                            <option key={cat.value} value={cat.label}>
                                                {cat.label}
                                            </option>
                                        ))}
                                        <option value="Other">Other</option>
                                    </select>
                                </Field>
                                <Field>
                                    <Label htmlFor="priority">Priority</Label>
                                    <select
                                        id="priority"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value as Priority)}
                                        className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value={PriorityEnum.LOW}>Low</option>
                                        <option value={PriorityEnum.MEDIUM}>Medium</option>
                                        <option value={PriorityEnum.HIGH}>High</option>
                                    </select>
                                </Field>
                            </div>
                            <Field>
                                <Label htmlFor="isRecurring">Recurring</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="isRecurring"
                                        type="checkbox"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                        className="h-4 w-4 rounded border-white/20 bg-white/5"
                                    />
                                    <p className="text-sm text-slate-400">Automatically repeat this task</p>
                                </div>
                            </Field>
                        </FieldGroup>
                    )}
                    {errors.form && <p className="text-red-400 text-sm mb-4">{errors.form}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} className="border-white/10 hover:bg-white/5 text-white">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
                        >
                            {isLoading ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Task" : "Create Task")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
