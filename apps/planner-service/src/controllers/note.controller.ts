import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";
import { logAuditAction } from "../services/audit.service.js";

export const createNote = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
        throw new ErrorHandler(400, "Content is required");
    }

    const note = await prisma.note.create({
        data: {
            userId,
            content,
        }
    });

    void logAuditAction(userId, "NOTE_CREATED", "NOTE", note.id);

    return res.status(201).json(note);
});

export const getNotes = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const notes = await prisma.note.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ notes });
});

export const deleteNote = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid note id");
    }

    const existingNote = await prisma.note.findUnique({
        where: { id },
    });

    if (!existingNote) {
        throw new ErrorHandler(404, "Note not found");
    }

    if (existingNote.userId !== userId) {
        throw new ErrorHandler(403, "Forbidden");
    }

    await prisma.note.delete({
        where: { id },
    });

    void logAuditAction(userId, "NOTE_DELETED", "NOTE", id);

    return res.status(200).json({ message: "Note deleted successfully" });
});
