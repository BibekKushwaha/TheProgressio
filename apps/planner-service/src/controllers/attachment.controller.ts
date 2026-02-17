import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

export const createAttachment = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId, name, url, size } = req.body;

    if (!taskId || !name || !url) {
        throw new ErrorHandler(400, "Task ID, name, and URL are required");
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

    const attachment = await prisma.attachment.create({
        data: {
            name,
            url,
            size: size || null,
            taskId,
        }
    });

    return res.status(201).json(attachment);
});

export const deleteAttachment = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== 'string') throw new ErrorHandler(400, "Invalid ID");

    const attachment = await prisma.attachment.findUnique({
        where: { id },
        include: { task: true }
    });

    if (!attachment) {
        throw new ErrorHandler(404, "Attachment not found");
    }

    if (attachment.task.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden");
    }

    await prisma.attachment.delete({
        where: { id }
    });

    return res.status(200).json({ message: "Attachment deleted" });
});
