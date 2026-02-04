import type { Request, Response } from "express";
import { prisma, Status, Priority } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

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
                status: (status as Status) ?? Status.PENDING,
                priority: (priority as Priority) ?? Priority.MEDIUM,
                dueDate: dueDate ? new Date(dueDate) : null,
                isRecurring: isRecurring ?? false,
                userId: req.user.id,
                categoryId: categoryId || null,
            },
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
        } = req.query;

        const pageNumber = Number(page);
        const pageSize = Number(limit);

        const tasks = await prisma.task.findMany({
            where: {
                userId: req.user.id,
                ...(status && { status: status as Status }),
                ...(priority && { priority: priority as Priority }),
                ...(categoryId && { categoryId: categoryId as string }),
                ...(search && typeof search === "string" && {
                    title: {
                        contains: search,
                        mode: "insensitive",
                    },
                }),
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

        const { title, status, priority, dueDate, isRecurring, categoryId } = req.body;

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
                ...(status && { status: status as Status }),
                ...(priority && { priority: priority as Priority }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(isRecurring !== undefined && { isRecurring }),
                ...(categoryId !== undefined && { categoryId: categoryId || null }),
            },
        });

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

        const newStatus =
            existingTask.status === Status.COMPLETED
                ? Status.PENDING
                : Status.COMPLETED;

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                status: newStatus,
            },
        });

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