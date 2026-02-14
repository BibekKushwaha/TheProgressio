import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { subtaskSchema } from "@repo/schemas/subtask";

export const createSubTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { taskId, title } = req.body;

        if (!taskId || !title) {
            return res.status(400).json({ message: "Task ID and title are required" });
        }

        const parsed = subtaskSchema.safeParse({ title, taskId });
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid subtask data",
                errors: parsed.error.flatten(),
            });
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

        const subTask = await prisma.subTask.create({
            data: {
                title,
                taskId,
                completed: false
            }
        });

        return res.status(201).json(subTask);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateSubTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (!id || typeof id !== 'string') return res.status(400).json({ message: "Invalid ID" });

        const { title, completed } = req.body;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const subTask = await prisma.subTask.findUnique({
            where: { id },
            include: { task: true }
        });

        if (!subTask) {
            return res.status(404).json({ message: "Subtask not found" });
        }

        if (subTask.task.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const updatedSubTask = await prisma.subTask.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(completed !== undefined && { completed })
            }
        });

        return res.status(200).json(updatedSubTask);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteSubTask = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        if (!id || typeof id !== 'string') return res.status(400).json({ message: "Invalid ID" });

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const subTask = await prisma.subTask.findUnique({
            where: { id },
            include: { task: true }
        });

        if (!subTask) {
            return res.status(404).json({ message: "Subtask not found" });
        }

        if (subTask.task.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await prisma.subTask.delete({
            where: { id }
        });

        return res.status(200).json({ message: "Subtask deleted" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
