import type { Request, Response } from "express";
import { prisma, Status, Priority } from "@repo/db";
import {
    parseTaskIntentSchema,
    previewSubtasksSchema,
    recoveryPlanSchema,
    scanSyllabusImageSchema,
    smartCreateTaskSchema,
    taskSchema,
} from "@repo/schemas/task";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { aiService } from "../services/ai.service.js";
import { emitTaskEvent, TaskEventType } from "../services/producer.service.js";
import { recoveryService } from "../services/recovery.service.js";

const HABIT_SERVICE_URL = process.env.HABIT_SERVICE_URL || "http://localhost:4002";
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || "http://localhost:4003";

const notifyHabitCategoryCompletion = async (params: {
    userId: string;
    categoryId: string | null;
    occurredAt: string;
}): Promise<void> => {
    if (process.env.NODE_ENV === "test") return;
    if (!params.categoryId) return;

    try {
        const response = await fetch(`${HABIT_SERVICE_URL}/api/habits/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "TaskCompleted",
                userId: params.userId,
                categoryId: params.categoryId,
                completedValue: 1,
                occurredAt: params.occurredAt,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(
                `⚠️ Habit automation event failed (${response.status}): ${errorText || "Unknown error"}`
            );
        }
    } catch (error) {
        console.warn("⚠️ Habit automation endpoint unreachable:", error);
    }
};

const notifyAnalyticsTaskCompletion = async (params: {
    taskId: string;
}): Promise<void> => {
    if (process.env.NODE_ENV === "test") return;
    try {
        const response = await fetch(`${ANALYTICS_SERVICE_URL}/api/stats/events/task-completed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "TASK_COMPLETED",
                taskId: params.taskId,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(
                `⚠️ Analytics completion event failed (${response.status}): ${errorText || "Unknown error"}`
            );
        }
    } catch (error) {
        console.warn("⚠️ Analytics completion endpoint unreachable:", error);
    }
};

const notifyAnalyticsTaskUpdate = async (params: {
    taskId: string;
    userId: string;
    changedFields: Record<string, unknown>;
}): Promise<void> => {
    if (process.env.NODE_ENV === "test") return;
    try {
        const response = await fetch(`${ANALYTICS_SERVICE_URL}/api/stats/events/task-completed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "TASK_UPDATED",
                taskId: params.taskId,
                userId: params.userId,
                changedFields: params.changedFields,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(
                `⚠️ Analytics update event failed (${response.status}): ${errorText || "Unknown error"}`
            );
        }
    } catch (error) {
        console.warn("⚠️ Analytics update endpoint unreachable:", error);
    }
};

const notifyAnalyticsTaskDeletion = async (params: {
    taskId: string;
    userId: string;
}): Promise<void> => {
    if (process.env.NODE_ENV === "test") return;
    try {
        const response = await fetch(`${ANALYTICS_SERVICE_URL}/api/stats/events/task-completed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "TASK_DELETED",
                taskId: params.taskId,
                userId: params.userId,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(
                `⚠️ Analytics deletion event failed (${response.status}): ${errorText || "Unknown error"}`
            );
        }
    } catch (error) {
        console.warn("⚠️ Analytics deletion endpoint unreachable:", error);
    }
};

export const runTaskCompletionSideEffects = async (params: {
    taskId: string;
    userId: string;
    title: string;
    categoryId: string | null;
    completedAt?: string;
}): Promise<void> => {
    const completedAt = params.completedAt ?? new Date().toISOString();

    await emitTaskEvent(TaskEventType.TASK_COMPLETED, params.taskId, params.userId, {
        title: params.title,
        categoryId: params.categoryId,
        completedAt,
    });

    await Promise.all([
        notifyHabitCategoryCompletion({
            userId: params.userId,
            categoryId: params.categoryId,
            occurredAt: completedAt,
        }),
        notifyAnalyticsTaskCompletion({ taskId: params.taskId }),
    ]);
};

export const createTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = taskSchema.safeParse(req.body);
        if (!parsed.success) {
            const titleIssue = parsed.error.issues.find((issue) => issue.path[0] === "title");
            return res.status(400).json({
                message: titleIssue ? "Title is required" : "Invalid task payload",
                errors: parsed.error.flatten(),
            });
        }

        const { title, description, status, priority, categoryId, dueDate, isRecurring, subjectId } = parsed.data;

        const task = await prisma.task.create({
            data: {
                title,
                description: description ?? null,
                status,
                priority,
                dueDate: dueDate ?? null,
                isRecurring: isRecurring ?? false,
                userId: req.user.id,
                categoryId: categoryId || null,
                subjectId: subjectId || null,
            },
        });

        // Emit task-created event
        await emitTaskEvent(TaskEventType.TASK_CREATED, task.id, req.user.id, {
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate,
            categoryId: task.categoryId,
        });

        return res.status(201).json(task);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllTasks = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const {
            page = "1",
            limit = "10",
            status,
            priority,
            categoryId,
            search,
            date, // 👈 New date parameter
        } = req.query;

        const pageNumber = Number(page);
        const pageSize = Number(limit);

        const tasks = await prisma.task.findMany({
            where: {
                userId: req.user.id,
                ...(status && { status: status as Status }),
                ...(priority && { priority: priority as Priority }),
                ...(categoryId && { categoryId: categoryId as string }),
                ...(date && typeof date === "string" && {
                    dueDate: {
                        gte: new Date(`${date}T00:00:00.000Z`),
                        lte: new Date(`${date}T23:59:59.999Z`),
                    },
                }),
                ...(search && typeof search === "string" && {
                    title: {
                        contains: search,
                        mode: "insensitive",
                    },
                }),
            },
            include: {
                category: true, // 👈 includes full category object
            },
            orderBy: {
                dueDate: "asc",
            },
            skip: (pageNumber - 1) * pageSize,
            take: pageSize,
        });

        return res.status(200).json(tasks);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getTaskById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid task id" });
        }

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                category: true,
                subtasks: {
                    orderBy: { createdAt: 'asc' }
                },
                attachments: true
            }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (task.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You don't own this task" });
        }

        return res.status(200).json(task);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;

        if (!req.body) {
            return res.status(400).json({
                message: "Request body is missing. Ensure Content-Type is application/json"
            });
        }

        const { title, description, status, priority, dueDate, isRecurring, categoryId } = req.body;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid task id" });
        }

        const existingTask = await prisma.task.findUnique({
            where: { id },
        });

        if (!existingTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (existingTask.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You don't own this task" });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                ...(typeof title === "string" && { title }),
                ...(typeof description === "string" && { description }),
                ...(status && { status: status as Status }),
                ...(priority && { priority: priority as Priority }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(isRecurring !== undefined && { isRecurring }),
                ...(categoryId !== undefined && { categoryId: categoryId || null }),
            },
        });

        // Emit task-updated event with changed fields
        const changedFields: Record<string, unknown> = {};
        if (typeof title === "string") changedFields.title = title;
        if (status) changedFields.status = status;
        if (priority) changedFields.priority = priority;
        if (dueDate !== undefined) changedFields.dueDate = dueDate;
        if (categoryId !== undefined) changedFields.categoryId = categoryId;

        await emitTaskEvent(TaskEventType.TASK_UPDATED, id, req.user.id, {
            changedFields,
            previousStatus: existingTask.status,
            newStatus: updatedTask.status,
        });

        // Notify analytics of the update (fire-and-forget)
        notifyAnalyticsTaskUpdate({
            taskId: id,
            userId: req.user.id,
            changedFields,
        });

        // If status changed to COMPLETED, also emit a completion event
        if (status && updatedTask.status === Status.COMPLETED && existingTask.status !== Status.COMPLETED) {
            await runTaskCompletionSideEffects({
                taskId: id,
                userId: req.user.id,
                title: updatedTask.title,
                categoryId: updatedTask.categoryId ?? null,
            });
        }

        return res.status(200).json(updatedTask);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid task id" });
        }

        const existingTask = await prisma.task.findUnique({
            where: { id },
        });

        if (!existingTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (existingTask.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You don't own this task" });
        }

        await prisma.task.delete({
            where: { id },
        });

        // Emit task-deleted event
        await emitTaskEvent(TaskEventType.TASK_DELETED, id, req.user.id, {
            title: existingTask.title,
            previousStatus: existingTask.status,
        });

        // Notify analytics to clean up stats (fire-and-forget)
        notifyAnalyticsTaskDeletion({ taskId: id, userId: req.user.id });

        return res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;

        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid task id" });
        }

        const existingTask = await prisma.task.findUnique({
            where: { id },
        });

        if (!existingTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (existingTask.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden: You don't own this task" });
        }

        let newStatus: Status;
        if (existingTask.status === Status.PENDING) {
            newStatus = Status.IN_PROGRESS;
        } else if (existingTask.status === Status.IN_PROGRESS) {
            newStatus = Status.COMPLETED;
        } else {
            newStatus = Status.PENDING;
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                status: newStatus,
            },
        });

        // Emit status-changed event
        await emitTaskEvent(TaskEventType.TASK_STATUS_CHANGED, id, req.user.id, {
            previousStatus: existingTask.status,
            newStatus: updatedTask.status,
            title: updatedTask.title,
        });

        // If toggled to COMPLETED, also emit a completion event
        if (newStatus === Status.COMPLETED) {
            await runTaskCompletionSideEffects({
                taskId: id,
                userId: req.user.id,
                title: updatedTask.title,
                categoryId: updatedTask.categoryId ?? null,
            });
        }

        return res.status(200).json(updatedTask);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const taskCategories = async (_req: Request, res: Response) => {
    // Placeholder for category logic if needed, user had it in routes
    return res.status(501).json({ message: "Not implemented" });
};

export const scanSyllabusImage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = scanSyllabusImageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "imageBase64 is required",
                errors: parsed.error.flatten(),
            });
        }

        const { imageBase64, mimeType } = parsed.data;
        const items = await aiService.scanSyllabusImage(imageBase64, typeof mimeType === "string" ? mimeType : "image/jpeg");
        return res.status(200).json({ items });
    } catch (error) {
        console.error("Scan syllabus error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const previewRecoveryPlan = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = recoveryPlanSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid recovery payload",
                errors: parsed.error.flatten(),
            });
        }

        const anchorDate = parsed.data.anchorDate ?? new Date();
        const plan = await recoveryService.preview(req.user.id, anchorDate);

        return res.status(200).json(plan);
    } catch (error) {
        console.error("Recovery preview error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const applyRecoveryPlan = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = recoveryPlanSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid recovery payload",
                errors: parsed.error.flatten(),
            });
        }

        const anchorDate = parsed.data.anchorDate ?? new Date();
        const result = await recoveryService.apply(req.user.id, anchorDate);

        return res.status(200).json(result);
    } catch (error) {
        console.error("Recovery apply error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

interface CreateTaskFromTextParams {
    userId: string;
    text: string;
    source: string;
    metadata?: Record<string, unknown>;
}

export const createTaskFromText = async ({
    userId,
    text,
    source,
    metadata = {},
}: CreateTaskFromTextParams) => {
    const parsedData = await aiService.parseTaskIntent(text);

    const task = await prisma.task.create({
        data: {
            title: parsedData.title || text,
            description: parsedData.description || `Generated from: "${text}"`,
            priority: (parsedData.priority as Priority) || Priority.MEDIUM,
            status: Status.PENDING,
            dueDate: parsedData.dueDate || null,
            userId,
        }
    });

    await emitTaskEvent(TaskEventType.TASK_CREATED, task.id, userId, {
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        source,
        rawInput: text,
        ...metadata,
    });

    return { task, parsedData };
};

export const smartCreateTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = smartCreateTaskSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Text input is required",
                errors: parsed.error.flatten(),
            });
        }

        const { text } = parsed.data;

        const { task, parsedData } = await createTaskFromText({
            userId: req.user.id,
            text,
            source: "nlp-smart-create",
        });

        return res.status(201).json({
            message: "Smart task created successfully",
            task,
            parsedMeta: parsedData
        });

    } catch (error) {
        console.error("Smart create error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const generateSubtasks = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;
        if (!id || typeof id !== 'string') return res.status(400).json({ message: "Task ID required" });

        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return res.status(404).json({ message: "Task not found" });

        // 1. Generate subtasks using Gemini
        const subtaskTitles = await aiService.generateSubtasks(task.title, task.description || "");

        // 2. Save to DB
        if (subtaskTitles.length > 0) {
            await prisma.subTask.createMany({
                data: subtaskTitles.map(title => ({
                    title,
                    taskId: id,
                    completed: false
                }))
            });
        }

        const updatedTask = await prisma.task.findUnique({
            where: { id },
            include: { subtasks: true }
        });

        return res.status(200).json(updatedTask);

    } catch (error) {
        console.error("Generate subtasks error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const previewSubtasks = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = previewSubtasksSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Title is required",
                errors: parsed.error.flatten(),
            });
        }

        const { title, description } = parsed.data;

        const subtaskTitles = await aiService.generateSubtasks(title, description || "");

        return res.status(200).json({ subtasks: subtaskTitles });

    } catch (error) {
        console.error("Preview subtasks error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
export const parseTaskIntent = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = parseTaskIntentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Text input is required",
                errors: parsed.error.flatten(),
            });
        }

        const { text } = parsed.data;

        const parsedData = await aiService.parseTaskIntent(text);

        return res.status(200).json(parsedData);

    } catch (error) {
        console.error("Parse task error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
