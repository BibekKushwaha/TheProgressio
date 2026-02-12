import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const normalizePatternLabels = (raw: unknown): string[] => {
    if (Array.isArray(raw)) {
        return raw.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof raw !== "string") return [];

    const clean = raw.trim();
    if (!clean) return [];

    const byComma = clean.split(",").map((item) => item.trim()).filter(Boolean);
    if (byComma.length >= 2) return byComma;

    const byDash = clean.split("-").map((item) => item.trim()).filter(Boolean);
    if (byDash.length >= 2) return byDash;

    const bySlash = clean.split("/").map((item) => item.trim()).filter(Boolean);
    if (bySlash.length >= 2) return bySlash;

    return byComma;
};

/**
 * Create a custom rotation pattern.
 * Body: { name, pattern: string[], startDate, cycleLengthDays? }
 */
export const createRotationPattern = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { name, pattern, startDate, cycleLengthDays } = req.body;
        const normalizedPattern = normalizePatternLabels(pattern);

        if (!name || typeof name !== "string") {
            return res.status(400).json({ message: "Name is required" });
        }

        if (normalizedPattern.length < 2) {
            return res.status(400).json({ message: "Pattern must be an array of at least 2 labels (e.g. [\"A\", \"B\"])" });
        }

        if (!startDate) {
            return res.status(400).json({ message: "startDate is required (anchor date for the rotation)" });
        }

        const rotationPattern = await prisma.rotationPattern.create({
            data: {
                name,
                pattern: normalizedPattern,
                startDate: new Date(startDate),
                cycleLengthDays: Number(cycleLengthDays) > 0 ? Number(cycleLengthDays) : 7,
                userId: req.user.id,
            },
        });

        return res.status(201).json(rotationPattern);
    } catch (error: any) {
        if (error.code === "P2002") {
            return res.status(400).json({ message: "A rotation pattern with that name already exists" });
        }
        console.error("Create rotation pattern error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Get all rotation patterns for the current user.
 */
export const getRotationPatterns = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const patterns = await prisma.rotationPattern.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json(patterns);
    } catch (error) {
        console.error("Get rotation patterns error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Get a single rotation pattern by ID.
 */
export const getRotationPatternById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const rawId = req.params.id;
<<<<<<< HEAD
        if (typeof rawId !== "string" || !rawId) {
            return res.status(400).json({ message: "Invalid rotation pattern id" });
        }
        const id = rawId;
=======
        const id = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!id) return res.status(400).json({ message: "Invalid rotation pattern id" });
>>>>>>> origin/main
        const pattern = await prisma.rotationPattern.findUnique({ where: { id } });

        if (!pattern) return res.status(404).json({ message: "Rotation pattern not found" });
        if (pattern.userId !== req.user.id) return res.status(403).json({ message: "Forbidden" });

        return res.status(200).json(pattern);
    } catch (error) {
        console.error("Get rotation pattern error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Update a rotation pattern.
 */
export const updateRotationPattern = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const rawId = req.params.id;
<<<<<<< HEAD
        if (typeof rawId !== "string" || !rawId) {
            return res.status(400).json({ message: "Invalid rotation pattern id" });
        }
        const id = rawId;
=======
        const id = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!id) return res.status(400).json({ message: "Invalid rotation pattern id" });
>>>>>>> origin/main
        const { name, pattern, startDate, cycleLengthDays, isActive } = req.body;
        const normalizedPattern = normalizePatternLabels(pattern);

        const existing = await prisma.rotationPattern.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "Rotation pattern not found" });
        if (existing.userId !== req.user.id) return res.status(403).json({ message: "Forbidden" });

        const updateData = {
            ...(name && { name }),
            ...(normalizedPattern.length > 0 && { pattern: normalizedPattern }),
            ...(startDate && { startDate: new Date(startDate) }),
            ...(cycleLengthDays !== undefined && Number(cycleLengthDays) > 0 && { cycleLengthDays: Number(cycleLengthDays) }),
            ...(isActive !== undefined && { isActive }),
        };

        let updated;
        if (isActive === true) {
            const [, activatedPattern] = await prisma.$transaction([
                prisma.rotationPattern.updateMany({
                    where: { userId: req.user.id, isActive: true, id: { not: id } },
                    data: { isActive: false },
                }),
                prisma.rotationPattern.update({
                    where: { id },
                    data: { ...updateData, isActive: true },
                }),
            ]);
            updated = activatedPattern;
        } else {
            updated = await prisma.rotationPattern.update({
                where: { id },
                data: updateData,
            });
        }

        return res.status(200).json(updated);
    } catch (error: any) {
        if (error.code === "P2002") {
            return res.status(400).json({ message: "A rotation pattern with that name already exists" });
        }
        console.error("Update rotation pattern error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Delete a rotation pattern.
 */
export const deleteRotationPattern = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const rawId = req.params.id;
<<<<<<< HEAD
        if (typeof rawId !== "string" || !rawId) {
            return res.status(400).json({ message: "Invalid rotation pattern id" });
        }
        const id = rawId;
=======
        const id = Array.isArray(rawId) ? rawId[0] : rawId;
        if (!id) return res.status(400).json({ message: "Invalid rotation pattern id" });
>>>>>>> origin/main

        const existing = await prisma.rotationPattern.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "Rotation pattern not found" });
        if (existing.userId !== req.user.id) return res.status(403).json({ message: "Forbidden" });

        await prisma.rotationPattern.delete({ where: { id } });

        return res.status(200).json({ message: "Rotation pattern deleted successfully" });
    } catch (error) {
        console.error("Delete rotation pattern error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Resolve: given a date, which rotation label is active?
 * Query: ?date=2026-02-10
 */
export const resolveRotation = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const rawDate = req.query.date;
        const date = typeof rawDate === "string" ? rawDate : undefined;
        const targetDate = date ? new Date(date) : new Date();

        if (isNaN(targetDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        // Find the active rotation pattern for this user
        const activePattern = await prisma.rotationPattern.findFirst({
            where: { userId: req.user.id, isActive: true },
            orderBy: { createdAt: "desc" },
        });

        if (!activePattern) {
            // Fallback to algorithmic A/B
            const startOfYear = new Date(targetDate.getFullYear(), 0, 1);
            const pastDays = Math.floor((targetDate.getTime() - startOfYear.getTime()) / (86400000));
            const weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
            return res.status(200).json({
                date: targetDate.toISOString().split("T")[0],
                rotation: weekNumber % 2 === 0 ? "B" : "A",
                source: "algorithmic-fallback",
                pattern: null,
            });
        }

        // Calculate which label is active for the given date
        const daysDiff = Math.floor(
            (targetDate.getTime() - new Date(activePattern.startDate).getTime()) / 86400000
        );
        const cycleIndex = Math.floor(daysDiff / activePattern.cycleLengthDays);
        const patternIndex = ((cycleIndex % activePattern.pattern.length) + activePattern.pattern.length) % activePattern.pattern.length;
        const activeLabel = activePattern.pattern[patternIndex];

        return res.status(200).json({
            date: targetDate.toISOString().split("T")[0],
            rotation: activeLabel,
            source: "custom-pattern",
            pattern: {
                id: activePattern.id,
                name: activePattern.name,
                labels: activePattern.pattern,
                cycleLengthDays: activePattern.cycleLengthDays,
            },
        });
    } catch (error) {
        console.error("Resolve rotation error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
