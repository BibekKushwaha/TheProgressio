import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

/**
 * Create a custom rotation pattern.
 * Body: { name, pattern: string[], startDate, cycleLengthDays? }
 */
export const createRotationPattern = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, pattern, startDate, cycleLengthDays } = req.body;

    if (!name || typeof name !== "string") {
        throw new ErrorHandler(400, "Name is required");
    }

    if (!Array.isArray(pattern) || pattern.length < 2) {
        throw new ErrorHandler(400, "Pattern must be an array of at least 2 labels (e.g. [\"A\", \"B\"])");
    }

    if (!startDate) {
        throw new ErrorHandler(400, "startDate is required (anchor date for the rotation)");
    }

    try {
        const rotationPattern = await prisma.rotationPattern.create({
            data: {
                name,
                pattern,
                startDate: new Date(startDate),
                cycleLengthDays: cycleLengthDays ?? 7,
                userId,
            },
        });

        return res.status(201).json(rotationPattern);
    } catch (error: any) {
        if (error.code === "P2002") {
            throw new ErrorHandler(400, "A rotation pattern with that name already exists");
        }
        throw error;
    }
});

/**
 * Get all rotation patterns for the current user.
 */
export const getRotationPatterns = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const patterns = await prisma.rotationPattern.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(patterns);
});

/**
 * Get a single rotation pattern by ID.
 */
export const getRotationPatternById = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) throw new ErrorHandler(400, "Invalid rotation pattern id");

    const pattern = await prisma.rotationPattern.findUnique({ where: { id } });

    if (!pattern) throw new ErrorHandler(404, "Rotation pattern not found");
    if (pattern.userId !== userId) throw new ErrorHandler(403, "Forbidden");

    return res.status(200).json(pattern);
});

/**
 * Update a rotation pattern.
 */
export const updateRotationPattern = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) throw new ErrorHandler(400, "Invalid rotation pattern id");

    const { name, pattern, startDate, cycleLengthDays, isActive } = req.body;

    const existing = await prisma.rotationPattern.findUnique({ where: { id } });
    if (!existing) throw new ErrorHandler(404, "Rotation pattern not found");
    if (existing.userId !== userId) throw new ErrorHandler(403, "Forbidden");

    try {
        const updated = await prisma.rotationPattern.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(Array.isArray(pattern) && { pattern }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(cycleLengthDays !== undefined && { cycleLengthDays }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        return res.status(200).json(updated);
    } catch (error: any) {
        if (error.code === "P2002") {
            throw new ErrorHandler(400, "A rotation pattern with that name already exists");
        }
        throw error;
    }
});

/**
 * Delete a rotation pattern.
 */
export const deleteRotationPattern = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) throw new ErrorHandler(400, "Invalid rotation pattern id");

    const existing = await prisma.rotationPattern.findUnique({ where: { id } });
    if (!existing) throw new ErrorHandler(404, "Rotation pattern not found");
    if (existing.userId !== userId) throw new ErrorHandler(403, "Forbidden");

    await prisma.rotationPattern.delete({ where: { id } });

    return res.status(200).json({ message: "Rotation pattern deleted successfully" });
});
