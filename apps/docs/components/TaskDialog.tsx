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
import { getApiErrorMessage } from "@/lib/api-error"
import { getTodayDateKey, toLocalDateKey } from "@/lib/date"
import { type FormErrors, zodErrorToFormErrors } from "@/lib/form"

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

type TaskDialogField = "title" | "description" | "dueDate" | "category" | "priority" | "smart" | "form";

export function TaskDialog({ onClose, onSubmit, task }: TaskDialogProps) {
    const isEdit = !!task;
    const [taskName, setTaskName] = useState(task?.title || '');
    const [description, setDescription] = useState<string>(task?.description ? task.description : "");
    const [categoryName, setCategoryName] = useState(task?.category?.name || '');
    const [dueDate, setDueDate] = useState<string>(
        (task?.dueDate
            ? toLocalDateKey(new Date(task.dueDate))
            : getTodayDateKey()) || ""
    );
    const [priority, setPriority] = useState<Priority>(task?.priority || PriorityEnum.MEDIUM);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors<TaskDialogField>>({});

    const dispatch = useAppDispatch();
    const [createTaskApi] = useCreateTaskMutation();
    const [updateTaskApi] = useUpdateTaskMutation();
    const [smartCreateTaskApi] = useSmartCreateTaskMutation();
    const [createCategoryApi] = useCreateCategoryMutation();

    const [mode, setMode] = useState<'manual' | 'smart'>('manual');
    const [smartInput, setSmartInput] = useState('');
    const { data: categories } = useGetCategoriesQuery();

    const submitSmartTask = async (): Promise<boolean> => {
        if (!smartInput.trim()) {
            setErrors({ smart: "Please enter a task description" });
            return false;
        }

        try {
            const response = await smartCreateTaskApi({ text: smartInput.trim() }).unwrap();
            if (!response.task) {
                setErrors({ smart: "Unable to create task from your input" });
                return false;
            }

            dispatch(addTask(response.task));
            return true;
        } catch (error: unknown) {
            setErrors({ smart: getApiErrorMessage(error, "Failed to create smart task") });
            return false;
        }
    };

    const resolveCategoryId = async (): Promise<string | null | undefined> => {
        const trimmedCategory = categoryName.trim();
        if (!trimmedCategory) return undefined;

        const normalizedCategory = trimmedCategory.toLowerCase();
        const existingCategory = categories?.find(
            (category) => category.name.toLowerCase() === normalizedCategory
        );
        if (existingCategory?.id) return existingCategory.id;

        const selectedCategory = CATEGORY_OPTIONS.find(
            (option) => option.label.toLowerCase() === normalizedCategory
        );
        const colorCode = selectedCategory?.color || '#6B7280';
        const categoryValidation = categorySchema.safeParse({ name: trimmedCategory, colorCode });

        if (!categoryValidation.success) {
            setErrors({
                category: categoryValidation.error.issues[0]?.message || "Category is invalid",
            });
            return null;
        }

        try {
            const categoryResponse = await createCategoryApi({
                name: categoryValidation.data.name,
                colorCode: categoryValidation.data.colorCode,
            }).unwrap();
            if (categoryResponse.id) {
                dispatch(addCategory(categoryResponse));
                return categoryResponse.id;
            }

            return undefined;
        } catch (error: unknown) {
            setErrors({ category: getApiErrorMessage(error, "Failed to create category") });
            return null;
        }
    };

    const submitManualTask = async (): Promise<boolean> => {
        const categoryId = await resolveCategoryId();
        if (categoryId === null) return false;

        const validationResult = taskSchema.safeParse({
            title: taskName.trim(),
            description: description.trim() || undefined,
            dueDate: new Date(dueDate),
            categoryId: categoryId || undefined,
            priority,
        });

        if (!validationResult.success) {
            const validationErrors = zodErrorToFormErrors(validationResult.error);
            setErrors({
                title: validationErrors.title,
                description: validationErrors.description,
                dueDate: validationErrors.dueDate,
                priority: validationErrors.priority,
                category: validationErrors.categoryId,
            });
            return false;
        }

        if (isEdit && task) {
            const updatedTask = await updateTaskApi({
                id: task.id,
                ...validationResult.data,
                status: validationResult.data.status as Status,
                priority: validationResult.data.priority as Priority,
                dueDate: validationResult.data.dueDate?.toISOString(),
            }).unwrap();
            dispatch(updateTaskAction(updatedTask));
            return true;
        }

        const createdTask = await createTaskApi({
            ...validationResult.data,
            priority: validationResult.data.priority as Priority,
            status: validationResult.data.status as Status,
            dueDate: validationResult.data.dueDate?.toISOString(),
        }).unwrap();
        dispatch(addTask(createdTask));
        return true;
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});

        try {
            const submissionSucceeded = mode === 'smart'
                ? await submitSmartTask()
                : await submitManualTask();

            if (!submissionSucceeded) return;

            await onSubmit();
            onClose();
        } catch (error: unknown) {
            setErrors((prev) => ({
                ...prev,
                form: getApiErrorMessage(error, `Failed to ${isEdit ? "update" : "create"} task`),
            }));
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
                                {errors.dueDate && <p className="text-red-400 text-xs mt-1">{errors.dueDate}</p>}
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
                                    {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
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
                                    {errors.priority && <p className="text-red-400 text-xs mt-1">{errors.priority}</p>}
                                </Field>
                            </div>
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
