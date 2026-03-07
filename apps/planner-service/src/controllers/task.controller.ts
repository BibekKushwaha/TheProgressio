import type { Response } from "express";
import { prisma, Status, Priority } from "@repo/db";
import { z } from "zod";
import {
    parseTaskIntentSchema,
    previewSubtasksSchema,
    recoveryPlanSchema,
    scanSyllabusImageSchema,
    smartCreateTaskSchema,
    taskSchema,
} from "@repo/schemas/task";
import { fromDbEffortValue, normalizeEffortValue, toDbEffortValue } from "@repo/schemas/effort";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { aiService, type ParsedTaskIntent } from "../services/ai.service.js";
import { postJsonRequest } from "../services/internal-http.service.js";
import { emitTaskEvent, TaskEventType } from "../services/queue.service.js";
import { recoveryService } from "../services/recovery.service.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";
import { logAuditAction } from "../services/audit.service.js";

const HABIT_SERVICE_URL = process.env.HABIT_SERVICE_URL || "http://localhost:4002";
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || "http://localhost:4003";
const parseTaskIntentResultSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.coerce.date().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    subject: z.string().optional(),
    effort: z.enum(["30m", "1h", "2h", "4h+"]).optional(),
    isRecurring: z.boolean().optional(),
    type: z.enum(["ASSIGNMENT", "EXAM", "STUDY_GOAL"]).optional(),
});

const serializeTaskEffort = <T extends { effort?: unknown }>(task: T): T & { effort: string | null } => {
    return {
        ...task,
        effort: fromDbEffortValue(task.effort) ?? null,
    };
};

const SIDE_EFFECT_OUTAGE_BACKOFF_MS = Number(process.env.SIDE_EFFECT_OUTAGE_BACKOFF_MS || 30000);
const sideEffectOutageUntil: Record<"habit" | "analytics", number> = {
    habit: 0,
    analytics: 0,
};
const sideEffectNextLogAt: Record<"habit" | "analytics", number> = {
    habit: 0,
    analytics: 0,
};

const isAIDisabled = (req: AuthenticatedRequest): boolean => {
    const raw = req.headers["x-ai-disabled"];
    if (Array.isArray(raw)) return raw.some((v) => v === "1" || v === "true");
    return raw === "1" || raw === "true";
};

const isTemporarilyUnavailable = (service: "habit" | "analytics"): boolean =>
    Date.now() < sideEffectOutageUntil[service];

const markServiceUnavailable = (service: "habit" | "analytics", reason: string): void => {
    const now = Date.now();
    sideEffectOutageUntil[service] = now + SIDE_EFFECT_OUTAGE_BACKOFF_MS;
    if (now >= sideEffectNextLogAt[service]) {
        sideEffectNextLogAt[service] = now + SIDE_EFFECT_OUTAGE_BACKOFF_MS;
        console.warn(`⚠️ ${service} side-effects unavailable (${reason}). Suppressing retries for ${Math.ceil(SIDE_EFFECT_OUTAGE_BACKOFF_MS / 1000)}s.`);
    }
};

const shouldOpenOutageWindow = (status: number): boolean => status === 0 || status >= 500;

const formatSideEffectFailure = (result: { status: number; bodyText: string | null; reason: string }): string => {
    if (result.status > 0) {
        return `${result.status}: ${result.bodyText || "Unknown error"}`;
    }

    return result.reason;
};

const notifyHabitCategoryCompletion = async (params: {
    userId: string;
    categoryId: string | null;
    occurredAt: string;
}): Promise<void> => {
    if (process.env.NODE_ENV === "test") return;
    if (!params.categoryId) return;
    if (isTemporarilyUnavailable("habit")) return;

    const result = await postJsonRequest({
        url: `${HABIT_SERVICE_URL}/api/habits/events`,
        body: {
            type: "TaskCompleted",
            userId: params.userId,
            categoryId: params.categoryId,
            completedValue: 1,
            occurredAt: params.occurredAt,
        },
        logContext: {
            service: "planner-service",
            subsystem: "task-side-effects",
            dependency: "habit-service",
            operation: "task_completed_event",
        },
    });

    if (!result.ok) {
        if (shouldOpenOutageWindow(result.status)) {
            markServiceUnavailable("habit", result.reason);
        }

        console.warn(`⚠️ Habit automation event failed (${formatSideEffectFailure(result)})`);
    }
};

const notifyAnalyticsTaskCompletion = async (params: {
    taskId: string;
}): Promise<void> => {
    if (process.env.NODE_ENV === "test") return;
    if (isTemporarilyUnavailable("analytics")) return;
    const result = await postJsonRequest({
        url: `${ANALYTICS_SERVICE_URL}/api/stats/events/task-completed`,
        body: {
            type: "TASK_COMPLETED",
            taskId: params.taskId,
        },
        logContext: {
            service: "planner-service",
            subsystem: "task-side-effects",
            dependency: "analytics-service",
            operation: "task_completed_event",
        },
    });

    if (!result.ok) {
        if (shouldOpenOutageWindow(result.status)) {
            markServiceUnavailable("analytics", result.reason);
        }

        console.warn(`⚠️ Analytics completion event failed (${formatSideEffectFailure(result)})`);
    }
};

const notifyAnalyticsTaskUpdate = async (params: {
    taskId: string;
    userId: string;
    changedFields: Record<string, unknown>;
}): Promise<void> => {
    if (process.env.NODE_ENV === "test") return;
    if (isTemporarilyUnavailable("analytics")) return;
    const result = await postJsonRequest({
        url: `${ANALYTICS_SERVICE_URL}/api/stats/events/task-completed`,
        body: {
            type: "TASK_UPDATED",
            taskId: params.taskId,
            userId: params.userId,
            changedFields: params.changedFields,
        },
        logContext: {
            service: "planner-service",
            subsystem: "task-side-effects",
            dependency: "analytics-service",
            operation: "task_updated_event",
        },
    });

    if (!result.ok) {
        if (shouldOpenOutageWindow(result.status)) {
            markServiceUnavailable("analytics", result.reason);
        }

        console.warn(`⚠️ Analytics update event failed (${formatSideEffectFailure(result)})`);
    }
};

const notifyAnalyticsTaskDeletion = async (params: {
    taskId: string;
    userId: string;
}): Promise<void> => {
    if (process.env.NODE_ENV === "test") return;
    if (isTemporarilyUnavailable("analytics")) return;
    const result = await postJsonRequest({
        url: `${ANALYTICS_SERVICE_URL}/api/stats/events/task-completed`,
        body: {
            type: "TASK_DELETED",
            taskId: params.taskId,
            userId: params.userId,
        },
        logContext: {
            service: "planner-service",
            subsystem: "task-side-effects",
            dependency: "analytics-service",
            operation: "task_deleted_event",
        },
    });

    if (!result.ok) {
        if (shouldOpenOutageWindow(result.status)) {
            markServiceUnavailable("analytics", result.reason);
        }

        console.warn(`⚠️ Analytics deletion event failed (${formatSideEffectFailure(result)})`);
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

export const createTask = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) {
        const titleIssue = parsed.error.issues.find((issue) => issue.path[0] === "title");
        throw new ErrorHandler(400, titleIssue ? "Title is required" : "Invalid task payload");
    }

    const { title, description, status, priority, categoryId, dueDate, isRecurring, subjectId, effort } = parsed.data;

    const task = await prisma.task.create({
        data: {
            title,
            description: description ?? null,
            status,
            priority,
            dueDate: dueDate ?? null,
            isRecurring: isRecurring ?? false,
            effort: toDbEffortValue(effort) ?? null,
            userId,
            categoryId: categoryId || null,
            subjectId: subjectId || null,
        },
    });

    void logAuditAction(userId, "TASK_CREATED", "TASK", task.id, JSON.stringify({ title }));

    // Emit task-created event
    await emitTaskEvent(TaskEventType.TASK_CREATED, task.id, userId, {
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        categoryId: task.categoryId,
    });

    return res.status(201).json(serializeTaskEffort(task));
});

export const getTaskMetrics = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // All five counts run in one round-trip via Promise.all over groupBy queries
    const [statusGroups, priorityGroups, overdueCount, dueTodayCount, noDueDateCount] = await Promise.all([
        prisma.task.groupBy({
            by: ["status"],
            where: { userId },
            _count: { _all: true },
        }),
        prisma.task.groupBy({
            by: ["priority"],
            where: { userId },
            _count: { _all: true },
        }),
        prisma.task.count({
            where: {
                userId,
                status: { not: "COMPLETED" },
                dueDate: { lt: now },
            },
        }),
        prisma.task.count({
            where: {
                userId,
                status: { not: "COMPLETED" },
                dueDate: { gte: todayStart, lt: todayEnd },
            },
        }),
        prisma.task.count({ where: { userId, dueDate: null } }),
    ]);

    const byStatus = Object.fromEntries(
        statusGroups.map((g) => [g.status.toLowerCase(), g._count._all])
    ) as Record<string, number>;

    const byPriority = Object.fromEntries(
        priorityGroups.map((g) => [g.priority.toLowerCase(), g._count._all])
    ) as Record<string, number>;

    const total = statusGroups.reduce((acc, g) => acc + g._count._all, 0);

    return res.status(200).json({
        total,
        pending:        byStatus["pending"]     ?? 0,
        inProgress:     byStatus["in_progress"]  ?? 0,
        completed:      byStatus["completed"]    ?? 0,
        highPriority:   byPriority["high"]        ?? 0,
        mediumPriority: byPriority["medium"]      ?? 0,
        lowPriority:    byPriority["low"]         ?? 0,
        overdue:        overdueCount,
        dueToday:       dueTodayCount,
        withoutDueDate: noDueDateCount,
    });
});

export const getAllTasks = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

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
            userId,
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

    return res.status(200).json(tasks.map((task) => serializeTaskEffort(task)));
});

export const getTaskById = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid task id");
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
        throw new ErrorHandler(404, "Task not found");
    }

    if (task.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden: You don't own this task");
    }

    return res.status(200).json(serializeTaskEffort(task));
});

export const updateTask = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid task id");
    }

    const parsed = taskSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid update payload");
    }

    const updates = parsed.data;

    const existingTask = await prisma.task.findUnique({
        where: { id },
    });

    if (!existingTask) {
        throw new ErrorHandler(404, "Task not found");
    }

    if (existingTask.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden: You don't own this task");
    }

    const updatedTask = await prisma.task.update({
        where: { id },
        data: {
            ...(updates.title && { title: updates.title }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.status && { status: updates.status }),
            ...(updates.priority && { priority: updates.priority }),
            ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
            ...(updates.isRecurring !== undefined && { isRecurring: updates.isRecurring }),
            ...(updates.categoryId !== undefined && { categoryId: updates.categoryId || null }),
            ...(updates.effort !== undefined && { effort: toDbEffortValue(updates.effort) || null }),
        },
    });

    void logAuditAction(userId, "TASK_UPDATED", "TASK", id, JSON.stringify(updates));

    // Emit task-updated event with changed fields
    const changedFields: Record<string, unknown> = {};
    if (updates.title) changedFields.title = updates.title;
    if (updates.status) changedFields.status = updates.status;
    if (updates.priority) changedFields.priority = updates.priority;
    if (updates.dueDate !== undefined) changedFields.dueDate = updates.dueDate;
    if (updates.categoryId !== undefined) changedFields.categoryId = updates.categoryId;

    await emitTaskEvent(TaskEventType.TASK_UPDATED, id, userId, {
        changedFields,
        previousStatus: existingTask.status,
        newStatus: updatedTask.status,
    });

    // Notify analytics of the update (fire-and-forget)
    notifyAnalyticsTaskUpdate({
        taskId: id,
        userId,
        changedFields,
    });

    // If status changed to COMPLETED, also emit a completion event
    if (updates.status === Status.COMPLETED && existingTask.status !== Status.COMPLETED) {
        await runTaskCompletionSideEffects({
            taskId: id,
            userId,
            title: updatedTask.title,
            categoryId: updatedTask.categoryId ?? null,
        });
    }

    return res.status(200).json(serializeTaskEffort(updatedTask));
});

export const deleteTask = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid task id");
    }

    const existingTask = await prisma.task.findUnique({
        where: { id },
    });

    if (!existingTask) {
        throw new ErrorHandler(404, "Task not found");
    }

    if (existingTask.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden: You don't own this task");
    }

    await prisma.task.delete({
        where: { id },
    });

    void logAuditAction(userId, "TASK_DELETED", "TASK", id);

    // Emit task-deleted event
    await emitTaskEvent(TaskEventType.TASK_DELETED, id, userId, {
        title: existingTask.title,
    });

    // Notify analytics (fire-and-forget)
    notifyAnalyticsTaskDeletion({ taskId: id, userId });

    return res.status(200).json({ message: "Task deleted" });
});

export const toggleTask = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid task id");
    }

    const existingTask = await prisma.task.findUnique({
        where: { id },
    });

    if (!existingTask) {
        throw new ErrorHandler(404, "Task not found");
    }

    if (existingTask.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden: You don't own this task");
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

    void logAuditAction(userId, "TASK_STATUS_CHANGED", "TASK", id, JSON.stringify({ newStatus }));

    // Emit status-changed event
    await emitTaskEvent(TaskEventType.TASK_STATUS_CHANGED, id, userId, {
        previousStatus: existingTask.status,
        newStatus: updatedTask.status,
        title: updatedTask.title,
    });

    // Notify analytics of the status change (redundant HTTP call, also handled via queue)
    notifyAnalyticsTaskUpdate({
        taskId: id,
        userId,
        changedFields: { status: updatedTask.status },
    });

    // If toggled to COMPLETED, also emit a completion event
    if (newStatus === Status.COMPLETED && existingTask.status !== Status.COMPLETED) {
        await runTaskCompletionSideEffects({
            taskId: id,
            userId,
            title: updatedTask.title,
            categoryId: updatedTask.categoryId ?? null,
        });
    }

    return res.status(200).json(serializeTaskEffort(updatedTask));
});

export const taskCategories = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const categories = await prisma.category.findMany({
        where: { userId },
    });

    return res.status(200).json(categories);
});

export const scanSyllabusImage = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const _userId = req.user!.id;

    const parsed = scanSyllabusImageSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid scan payload");
    }

    const { imageBase64, mimeType } = parsed.data;
    const items = await aiService.scanSyllabusImage(
        imageBase64,
        typeof mimeType === "string" ? mimeType : "image/jpeg",
        { disableAI: isAIDisabled(req) },
    );
    return res.status(200).json({ items });
});

export const previewRecoveryPlan = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const parsed = recoveryPlanSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid recovery payload");
    }

    const anchorDate = parsed.data.anchorDate ?? new Date();
    const plan = await recoveryService.preview(userId, anchorDate);

    return res.status(200).json(plan);
});

export const applyRecoveryPlan = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const parsed = recoveryPlanSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid recovery payload");
    }

    const { anchorDate, taskIds, overrides } = parsed.data;
    const result = await recoveryService.apply(userId, anchorDate, taskIds, overrides);

    return res.status(200).json(result);
});

interface CreateTaskFromTextParams {
    userId: string;
    text: string;
    source: string;
    metadata?: Record<string, unknown>;
    parsedDataOverride?: Partial<ParsedTaskIntent>;
    disableAI?: boolean;
}

export const createTaskFromText = async ({
    userId,
    text,
    source,
    metadata = {},
    parsedDataOverride,
    disableAI = false,
}: CreateTaskFromTextParams) => {
    const parsedData = parsedDataOverride
        ? {
            title: parsedDataOverride.title || text,
            description: parsedDataOverride.description,
            dueDate: parsedDataOverride.dueDate,
            priority: parsedDataOverride.priority,
            subject: parsedDataOverride.subject,
            effort: parsedDataOverride.effort,
            isRecurring: parsedDataOverride.isRecurring,
            type: parsedDataOverride.type,
        }
        : await aiService.parseTaskIntent(text, { disableAI });

    const task = await prisma.task.create({
        data: {
            title: parsedData.title || text,
            description: parsedData.description || `Generated from: "${text}"`,
            priority: (parsedData.priority as Priority) || Priority.MEDIUM,
            status: Status.PENDING,
            dueDate: parsedData.dueDate || null,
            effort: toDbEffortValue(parsedData.effort) || null,
            isRecurring: parsedData.isRecurring || false,
            userId,
        }
    });

    void logAuditAction(userId, "TASK_CREATED", "TASK", task.id, JSON.stringify({ title: task.title }));

    await emitTaskEvent(TaskEventType.TASK_CREATED, task.id, userId, {
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
        source,
        rawInput: text,
        ...metadata,
    });

    return { task: serializeTaskEffort(task), parsedData };
};

export const smartCreateTask = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const parsed = smartCreateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ErrorHandler(400, "Text input is required");
    }

    const { text } = parsed.data;

    const { task, parsedData } = await createTaskFromText({
        userId: userId,
        text,
        source: "nlp-smart-create",
        disableAI: isAIDisabled(req),
    });

    return res.status(201).json({
        message: "Smart task created successfully",
        task,
        parsedMeta: parsedData
    });
});

export const generateSubtasks = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { id } = req.params;
    if (!id || typeof id !== 'string') throw new ErrorHandler(400, "Task ID required");

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw new ErrorHandler(404, "Task not found");

    if (task.userId !== userId) throw new ErrorHandler(403, "Forbidden");

    let syllabusContext: string | null = null;
    if (task.categoryId) {
        const linked = await prisma.taskSyllabusTopic.findMany({
            where: { userId, taskId: task.id },
            include: { topic: { select: { chapter: true, title: true } } },
            take: 12,
        });

        if (linked.length > 0) {
            syllabusContext = [
                "Linked topics:",
                ...linked.map((l) => `- ${l.topic.chapter}: ${l.topic.title}`),
            ].join("\n");
        } else {
            const topics = await prisma.syllabusTopic.findMany({
                where: { userId, categoryId: task.categoryId },
                select: { chapter: true, title: true },
                orderBy: [{ chapter: "asc" }, { title: "asc" }],
                take: 20,
            });
            if (topics.length > 0) {
                syllabusContext = [
                    "Subject topics:",
                    ...topics.map((t) => `- ${t.chapter}: ${t.title}`),
                ].join("\n");
            }
        }
    }

    // 1. Generate subtasks using AI (curriculum-grounded when possible)
    const subtaskTitles = await aiService.generateSubtasks(
        task.title,
        task.description || "",
        { disableAI: isAIDisabled(req) },
        { syllabusContext },
    );

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

    return res.status(200).json(updatedTask ? serializeTaskEffort(updatedTask) : updatedTask);
});

export const previewSubtasks = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const _userId = req.user!.id;

    const parsed = previewSubtasksSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid preview payload");
    }

    const { title, description } = parsed.data;

    const subtaskTitles = await aiService.generateSubtasks(title, description || "", { disableAI: isAIDisabled(req) });

    return res.status(200).json({ subtasks: subtaskTitles });
});

export const parseTaskIntent = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const _userId = req.user!.id;

    const parsed = parseTaskIntentSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new ErrorHandler(400, "Text input is required");
    }

    const { text } = parsed.data;

    const parsedData = await aiService.parseTaskIntent(text, { disableAI: isAIDisabled(req) });
    const normalized = parseTaskIntentResultSchema.parse({
        ...parsedData,
        effort: normalizeEffortValue(parsedData.effort),
    });

    return res.status(200).json(normalized);
});
