import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { categorySchema } from "@repo/schemas/category";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

export const createCategory = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, colorCode, icon } = req.body;

    if (!name || typeof name !== "string") {
        throw new ErrorHandler(400, "Name is required");
    }

    const parsed = categorySchema.safeParse({
        name,
        colorCode: (colorCode && /^#[0-9A-F]{6}$/i.test(colorCode)) ? colorCode : "#3B82F6",
        icon: icon || undefined,
    });
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid category data");
    }

    try {
        const category = await prisma.category.create({
            data: {
                name,
                colorCode: colorCode ?? "#3B82F6",
                icon: icon ?? null,
                userId,
            },
        });

        return res.status(201).json(category);
    } catch (error: any) {
        if (error.code === 'P2002') {
            throw new ErrorHandler(400, "Category name must be unique for this user");
        }
        throw error;
    }
});

export const getAllCategories = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const categories = await prisma.category.findMany({
        where: { userId },
        include: {
            _count: {
                select: { tasks: true }
            }
        }
    });

    return res.status(200).json(categories);
});

export const getCategoryById = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid category id");
    }

    const category = await prisma.category.findUnique({
        where: { id },
        include: {
            tasks: true
        }
    });

    if (!category) {
        throw new ErrorHandler(404, "Category not found");
    }

    if (category.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden");
    }

    return res.status(200).json(category);
});

export const updateCategory = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid category id");
    }
    const { name, colorCode, icon } = req.body;

    const existingCategory = await prisma.category.findUnique({
        where: { id },
    });

    if (!existingCategory) {
        throw new ErrorHandler(404, "Category not found");
    }

    if (existingCategory.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden");
    }

    try {
        const updatedCategory = await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(colorCode && { colorCode }),
                ...(icon !== undefined && { icon: icon || null }),
            },
        });

        return res.status(200).json(updatedCategory);
    } catch (error: any) {
        if (error.code === 'P2002') {
            throw new ErrorHandler(400, "Category name must be unique for this user");
        }
        throw error;
    }
});

export const deleteCategory = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid category id");
    }

    const existingCategory = await prisma.category.findUnique({
        where: { id },
    });

    if (!existingCategory) {
        throw new ErrorHandler(404, "Category not found");
    }

    if (existingCategory.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden");
    }

    await prisma.category.delete({
        where: { id },
    });

    return res.status(200).json({ message: "Category deleted successfully" });
});
