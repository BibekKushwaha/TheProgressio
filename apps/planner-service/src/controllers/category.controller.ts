import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { name, colorCode } = req.body;

        if (!name || typeof name !== "string") {
            return res.status(400).json({ message: "Name is required" });
        }

        const category = await prisma.category.create({
            data: {
                name,
                colorCode: colorCode ?? "#3B82F6",
                userId: req.user.id,
            },
        });

        return res.status(201).json(category);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Category name must be unique for this user" });
        }
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getAllCategories = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const categories = await prisma.category.findMany({
            where: {
                userId: req.user.id,
            },
            include: {
                _count: {
                    select: { tasks: true }
                }
            }
        });

        return res.status(200).json(categories);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getCategoryById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;

        if (typeof id !== "string") {
            return res.status(400).json({ message: "Invalid category id" });
        }

        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                tasks: true
            }
        });

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        if (category.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        return res.status(200).json(category);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;
        if (typeof id !== "string") {
            return res.status(400).json({ message: "Invalid category id" });
        }
        const { name, colorCode } = req.body;

        const existingCategory = await prisma.category.findUnique({
            where: { id },
        });

        if (!existingCategory) {
            return res.status(404).json({ message: "Category not found" });
        }

        if (existingCategory.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const updatedCategory = await prisma.category.update({
            where: { id: id as string },
            data: {
                ...(name && { name }),
                ...(colorCode && { colorCode }),
            },
        });

        return res.status(200).json(updatedCategory);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: "Category name must be unique for this user" });
        }
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { id } = req.params;

        if (typeof id !== "string") {
            return res.status(400).json({ message: "Invalid category id" });
        }

        const existingCategory = await prisma.category.findUnique({
            where: { id },
        });

        if (!existingCategory) {
            return res.status(404).json({ message: "Category not found" });
        }

        if (existingCategory.userId !== req.user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await prisma.category.delete({
            where: { id: id as string },
        });

        return res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
