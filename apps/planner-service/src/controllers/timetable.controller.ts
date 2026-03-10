import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { timetableService } from "../services/timetable.service.js";
import { aiService } from "../services/ai.service.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

const parseDateInput = (value: unknown): Date | null => {
    if (typeof value !== "string" || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const decodeTextFile = (fileBase64: string): string => {
    const payload = fileBase64.startsWith("data:")
        ? fileBase64.split(",")[1] ?? ""
        : fileBase64;

    if (!payload) return "";

    try {
        return Buffer.from(payload, "base64").toString("utf8");
    } catch {
        return "";
    }
};

const collectDetectedSubjects = (entries: Array<{ subjectName: string; confidence: number }>) => {
    const subjectMap = new Map<string, number>();

    for (const entry of entries) {
        const subjectName = entry.subjectName.trim();
        if (!subjectName) continue;
        const key = subjectName.toLowerCase();
        const current = subjectMap.get(key) ?? 0;
        subjectMap.set(key, Math.max(current, entry.confidence));
    }

    return Array.from(subjectMap.entries())
        .map(([key, confidence]) => ({
            name: entries.find((entry) => entry.subjectName.trim().toLowerCase() === key)?.subjectName ?? key,
            confidence,
        }))
        .sort((a, b) => b.confidence - a.confidence);
};

// GET /timetable/daily
export const getDailySchedule = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { date } = req.query;

    let targetDate = new Date();

    if (typeof date === "string" && date.trim()) {
        const parts = date.split('-');
        if (parts.length === 3) {
            const y = Number(parts[0]);
            const m = Number(parts[1]);
            const d = Number(parts[2]);
            if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
                // Use local timezone midnight to match client's concept of 'today'
                targetDate = new Date(y, m - 1, d);
            } else {
                throw new ErrorHandler(400, "Invalid date format");
            }
        } else {
            throw new ErrorHandler(400, "Invalid date format. Expected YYYY-MM-DD");
        }
    }

    if (Number.isNaN(targetDate.getTime())) {
        throw new ErrorHandler(400, "Invalid date format");
    }

    const schedule = await timetableService.getDailySchedule(userId, targetDate);
    return res.status(200).json(schedule);
});

// POST /timetable/import/preview
export const previewTimetableImport = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const body = req.body ?? {};
    const sourceType = body.sourceType;

    if (sourceType !== "text" && sourceType !== "file") {
        throw new ErrorHandler(400, "sourceType must be 'text' or 'file'");
    }

    let entries: Awaited<ReturnType<typeof timetableService.previewTimetableImport>>["entries"] = [];
    let warnings: string[] = [];
    let parser = {
        deterministicMatches: 0,
        aiMatches: 0,
        normalizedLines: 0,
    };

    if (sourceType === "text") {
        const text = typeof body.text === "string" ? body.text.trim() : "";
        if (!text) {
            throw new ErrorHandler(400, "text is required for sourceType 'text'");
        }

        const result = timetableService.previewTimetableImport(text);
        entries = result.entries;
        warnings = result.warnings;
        parser = result.parser;
    } else {
        const fileBase64 = typeof body.fileBase64 === "string" ? body.fileBase64 : "";
        const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";

        if (!fileBase64 || !mimeType) {
            throw new ErrorHandler(400, "fileBase64 and mimeType are required for sourceType 'file'");
        }

        if (mimeType.startsWith("image/")) {
            entries = await aiService.previewTimetableImportFromImage(fileBase64, mimeType);
            if (entries.length === 0) {
                warnings = ["No timetable rows could be extracted from that image."];
            }
            parser = {
                deterministicMatches: 0,
                aiMatches: entries.length,
                normalizedLines: 0,
            };
        } else {
            const extractedText =
                mimeType.includes("pdf")
                    ? await aiService.extractDocumentText(fileBase64, mimeType)
                    : decodeTextFile(fileBase64);

            if (!extractedText.trim()) {
                return res.status(200).json({
                    entries: [],
                    detectedSubjects: [],
                    warnings: ["No readable text could be extracted from that file."],
                    parser,
                });
            }

            const result = timetableService.previewTimetableImport(extractedText);
            entries = result.entries;
            warnings = result.warnings;
            parser = result.parser;
        }
    }

    const existingEntries = await timetableService.listTimetableEntries(userId);
    const decoratedEntries = timetableService.decoratePreviewEntries(entries, existingEntries);

    return res.status(200).json({
        entries: decoratedEntries,
        detectedSubjects: collectDetectedSubjects(decoratedEntries),
        warnings,
        parser,
    });
});

// GET /timetable/holidays
export const listHolidays = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const holidays = await timetableService.listHolidays(userId);
    return res.status(200).json({ holidays });
});

// POST /timetable/holidays
export const createHoliday = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const { name, startDate, endDate, pauseNotifications } = req.body ?? {};

    if (!name || typeof name !== "string") {
        throw new ErrorHandler(400, "name is required");
    }

    const parsedStart = parseDateInput(startDate);
    const parsedEnd = parseDateInput(endDate);
    if (!parsedStart || !parsedEnd) {
        throw new ErrorHandler(400, "startDate and endDate are required in ISO date format");
    }

    if (parsedEnd < parsedStart) {
        throw new ErrorHandler(400, "endDate cannot be before startDate");
    }

    const holiday = await timetableService.createHoliday({
        userId,
        name: name.trim(),
        startDate: parsedStart,
        endDate: parsedEnd,
        pauseNotifications: typeof pauseNotifications === "boolean" ? pauseNotifications : true,
    });

    return res.status(201).json({ holiday });
});

// PATCH /timetable/holidays/:id
export const updateHoliday = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid holiday id");
    }

    const { name, startDate, endDate, pauseNotifications } = req.body ?? {};
    const parsedStart = startDate !== undefined ? parseDateInput(startDate) : undefined;
    const parsedEnd = endDate !== undefined ? parseDateInput(endDate) : undefined;

    if ((startDate !== undefined && !parsedStart) || (endDate !== undefined && !parsedEnd)) {
        throw new ErrorHandler(400, "Invalid date format for startDate/endDate");
    }

    if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
        throw new ErrorHandler(400, "endDate cannot be before startDate");
    }

    const updated = await timetableService.updateHoliday({
        id,
        userId,
        data: {
            ...(typeof name === "string" ? { name: name.trim() } : {}),
            ...(parsedStart ? { startDate: parsedStart } : {}),
            ...(parsedEnd ? { endDate: parsedEnd } : {}),
            ...(typeof pauseNotifications === "boolean" ? { pauseNotifications } : {}),
        },
    });

    if (updated.count === 0) {
        throw new ErrorHandler(404, "Holiday not found");
    }

    return res.status(200).json({ message: "Holiday updated" });
});

// DELETE /timetable/holidays/:id
export const deleteHoliday = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Invalid holiday id");
    }

    const removed = await timetableService.deleteHoliday({ id, userId });
    if (removed.count === 0) {
        throw new ErrorHandler(404, "Holiday not found");
    }

    return res.status(200).json({ message: "Holiday deleted" });
});

// Timetable Entry CRUD
export const listTimetableEntries = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const entries = await timetableService.listTimetableEntries(userId);
    return res.status(200).json({ entries });
});

export const createTimetableEntry = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { dayOfWeek, startTime, endTime, subjectId, rotation } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime || !subjectId) {
        throw new ErrorHandler(400, "dayOfWeek, startTime, endTime, subjectId are required");
    }

    const entry = await timetableService.createTimetableEntry({
        userId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        subjectId,
        rotation,
    });

    return res.status(201).json(entry);
});

export const updateTimetableEntry = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { dayOfWeek, startTime, endTime, subjectId, rotation } = req.body;

    const data: any = {};
    if (dayOfWeek !== undefined) data.dayOfWeek = Number(dayOfWeek);
    if (startTime !== undefined) data.startTime = startTime;
    if (endTime !== undefined) data.endTime = endTime;
    if (subjectId !== undefined) data.subjectId = subjectId;
    if (rotation !== undefined) data.rotation = rotation === "" ? null : rotation;

    const entry = await timetableService.updateTimetableEntry({
        id: id as string,
        userId,
        data
    });

    return res.status(200).json(entry);
});

export const deleteTimetableEntry = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const removed = await timetableService.deleteTimetableEntry({ id: id as string, userId });
    if (removed.count === 0) {
        throw new ErrorHandler(404, "Entry not found");
    }

    return res.status(200).json({ message: "Entry deleted" });
});

// Subject CRUD
export const listSubjects = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const subjects = await timetableService.listSubjects(userId);
    return res.status(200).json(subjects);
});

export const createSubject = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, color, room, teacher } = req.body;

    if (!name) {
        throw new ErrorHandler(400, "name is required");
    }

    const subject = await timetableService.createSubject({
        userId,
        name,
        color,
        room,
        teacher,
    });

    return res.status(201).json(subject);
});

export const deleteSubject = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const removed = await timetableService.deleteSubject({ id: id as string, userId });
    if (removed.count === 0) {
        throw new ErrorHandler(404, "Subject not found");
    }

    return res.status(200).json({ message: "Subject deleted" });
});
