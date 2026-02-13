import type { Request, Response } from "express";
import { prisma, Status, Priority } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { aiService } from "../services/ai.service.js";
import { emitTaskEvent, TaskEventType } from "../services/producer.service.js";
import { recoveryService } from "../services/recovery.service.js";
import { buildInternalEventHeaders } from "../services/internal-auth.service.js";

const HABIT_SERVICE_URL = process.env.HABIT_SERVICE_URL || "http://localhost:4002";
const MAX_SYLLABUS_IMAGE_BYTES = 5 * 1024 * 1024;

const notifyHabitCategoryCompletion = async (params: {
    userId: string;
    categoryId: string | null;
    occurredAt: string;
}): Promise<void> => {
    if (!params.categoryId) return;

    try {
        const eventPayload = {
            type: "TaskCompleted",
            userId: params.userId,
            categoryId: params.categoryId,
            completedValue: 1,
            occurredAt: params.occurredAt,
        };

        const response = await fetch(`${HABIT_SERVICE_URL}/api/habits/events`, {
            method: "POST",
            headers: buildInternalEventHeaders(eventPayload),
            body: JSON.stringify(eventPayload),
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

export const createTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!req.body) {
            return res.status(400).json({
                message: "Request body is missing. Ensure Content-Type is application/json"
            });
        }

        const { title, description, status, priority, categoryId, dueDate, isRecurring } = req.body;

        if (!title || typeof title !== "string") {
            return res.status(400).json({ message: "Title is required" });
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                status: (status as Status) ?? Status.PENDING,
                priority: (priority as Priority) ?? Priority.MEDIUM,
                dueDate: dueDate ? new Date(dueDate) : null,
                isRecurring: isRecurring ?? false,
                userId: req.user.id,
                categoryId: categoryId || null,
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

        // If status changed to COMPLETED, also emit a completion event
        if (status && updatedTask.status === Status.COMPLETED && existingTask.status !== Status.COMPLETED) {
            const completedAt = new Date().toISOString();
            await emitTaskEvent(TaskEventType.TASK_COMPLETED, id, req.user.id, {
                title: updatedTask.title,
                categoryId: updatedTask.categoryId,
                completedAt,
            });

            await notifyHabitCategoryCompletion({
                userId: req.user.id,
                categoryId: updatedTask.categoryId ?? null,
                occurredAt: completedAt,
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
            const completedAt = new Date().toISOString();
            await emitTaskEvent(TaskEventType.TASK_COMPLETED, id, req.user.id, {
                title: updatedTask.title,
                categoryId: updatedTask.categoryId,
                completedAt,
            });

            await notifyHabitCategoryCompletion({
                userId: req.user.id,
                categoryId: updatedTask.categoryId ?? null,
                occurredAt: completedAt,
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

        const { text } = req.body;
        if (!text || typeof text !== "string") {
            return res.status(400).json({ message: "Text input is required" });
        }

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

        const { title, description } = req.body;
        if (!title || typeof title !== "string") {
            return res.status(400).json({ message: "Title is required" });
        }

        const subtaskTitles = await aiService.generateSubtasks(title, description || "");

        return res.status(200).json({ subtasks: subtaskTitles });

    } catch (error) {
        console.error("Preview subtasks error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const scanSyllabusImage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { imageBase64, mimeType } = req.body as {
            imageBase64?: string;
            mimeType?: string;
        };

        if (!imageBase64 || typeof imageBase64 !== "string") {
            return res.status(400).json({ message: "imageBase64 is required" });
        }

        const sanitizedBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "").trim();
        if (!sanitizedBase64) {
            return res.status(400).json({ message: "Invalid image payload" });
        }

        const imageBytes = Buffer.byteLength(sanitizedBase64, "base64");
        if (imageBytes > MAX_SYLLABUS_IMAGE_BYTES) {
            return res.status(413).json({ message: "Image is too large. Max size is 5MB." });
        }

        const items = await aiService.scanSyllabusImage(
            sanitizedBase64,
            typeof mimeType === "string" && mimeType ? mimeType : "image/jpeg"
        );

        return res.status(200).json({
            items: items.map((item) => ({
                ...item,
                dueDate: item.dueDate ? item.dueDate.toISOString() : undefined,
            })),
        });
    } catch (error) {
        console.error("Syllabus scan error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const parseTaskIntent = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { text } = req.body;
        if (!text || typeof text !== "string") {
            return res.status(400).json({ message: "Text input is required" });
        }

        const parsedData = await aiService.parseTaskIntent(text);

        return res.status(200).json(parsedData);

    } catch (error) {
        console.error("Parse task error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// POST /tasks/recovery/preview
export const previewRecoveryPlan = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const anchorDate = req.body?.anchorDate ? new Date(req.body.anchorDate) : new Date();
        if (Number.isNaN(anchorDate.getTime())) {
            return res.status(400).json({ message: "Invalid anchorDate" });
        }

        const plan = await recoveryService.preview(req.user.id, anchorDate);
        return res.status(200).json({ message: "Recovery preview generated", plan });
    } catch (error) {
        console.error("Recovery preview error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// POST /tasks/recovery/apply
export const applyRecoveryPlan = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const anchorDate = req.body?.anchorDate ? new Date(req.body.anchorDate) : new Date();
        if (Number.isNaN(anchorDate.getTime())) {
            return res.status(400).json({ message: "Invalid anchorDate" });
        }

        const { plan, updatedCount } = await recoveryService.apply(req.user.id, anchorDate);
        return res.status(200).json({
            message: "Recovery plan applied",
            updatedCount,
            plan,
        });
    } catch (error) {
        console.error("Recovery apply error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
