import type { Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

export const createExam = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { title, date, durationMinutes, location, topics, priority, subjectId, subjectName } = req.body;

    if (!title || !date) {
        throw new ErrorHandler(400, "Title and date are required");
    }

    let finalSubjectId = (typeof subjectId === 'string' && subjectId.length > 0) ? subjectId : null;

    // If no subjectId, resolve via subjectName or fallback to title
    if (!finalSubjectId) {
        const resolvedSubjectName = subjectName || title;
        const subject = await prisma.subject.upsert({
            where: {
                userId_name: {
                    userId,
                    name: resolvedSubjectName
                }
            },
            update: {},
            create: {
                name: resolvedSubjectName,
                userId
            }
        });
        finalSubjectId = subject.id;
    }

    const exam = await prisma.exam.create({
        data: {
            title,
            date: new Date(date),
            durationMinutes: Number(durationMinutes) || 120,
            location,
            topics,
            priority: priority || "HIGH",
            subjectId: finalSubjectId,
            userId
        }
    });

    return res.status(201).json({
        message: "Exam scheduled successfully",
        exam
    });
});
