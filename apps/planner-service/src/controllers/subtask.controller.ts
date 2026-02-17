import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { subtaskSchema } from "@repo/schemas/subtask";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

export const createSubTask = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId, title } = req.body;

    if (!taskId || !title) {
        throw new ErrorHandler(400, "Task ID and title are required");
    }

    const parsed = subtaskSchema.safeParse({ title, taskId });
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid subtask data");
    }

    // Verify task ownership
    const task = await prisma.task.findUnique({
        where: { id: taskId }
    });

    if (!task) {
        throw new ErrorHandler(404, "Task not found");
    }

    if (task.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden");
    }

    const subTask = await prisma.subTask.create({
        data: {
            title,
            taskId,
            completed: false
        }
    });

    return res.status(201).json(subTask);
});

export const updateSubTask = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string') throw new ErrorHandler(400, "Invalid ID");

    const { title, completed } = req.body;

    const subTask = await prisma.subTask.findUnique({
        where: { id },
        include: { task: true }
    });

    if (!subTask) {
        throw new ErrorHandler(404, "Subtask not found");
    }

    if (subTask.task.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden");
    }

    const updatedSubTask = await prisma.subTask.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(completed !== undefined && { completed })
        }
    });

    return res.status(200).json(updatedSubTask);
});

export const deleteSubTask = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string') throw new ErrorHandler(400, "Invalid ID");

    const subTask = await prisma.subTask.findUnique({
        where: { id },
        include: { task: true }
    });

    if (!subTask) {
        throw new ErrorHandler(404, "Subtask not found");
    }

    if (subTask.task.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden");
    }

    await prisma.subTask.delete({
        where: { id }
    });

    return res.status(200).json({ message: "Subtask deleted" });
});
