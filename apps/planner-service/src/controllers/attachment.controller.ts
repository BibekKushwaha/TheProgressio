import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export const createAttachment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { taskId, name, url, size } = req.body;

        if (!taskId || !name || !url) {
            return res.status(400).json({ message: "Task ID, name, and URL are required" });
        }

        // Verify task ownership
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (task.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden" });
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
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteAttachment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const attachment = await prisma.attachment.findUnique({
            where: { id: id as string },
            include: { task: true }
        });

        if (!attachment) {
            return res.status(404).json({ message: "Attachment not found" });
        }

        if (attachment.task.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await prisma.attachment.delete({
            where: { id: id as string }
        });

        return res.status(200).json({ message: "Attachment deleted" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
