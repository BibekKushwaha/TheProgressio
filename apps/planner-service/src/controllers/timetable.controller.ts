import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { timetableService } from "../services/timetable.service.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

const parseDateInput = (value: unknown): Date | null => {
    if (typeof value !== "string" || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// GET /timetable/daily
export const getDailySchedule = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();

    if (Number.isNaN(targetDate.getTime())) {
        throw new ErrorHandler(400, "Invalid date format");
    }

    const schedule = await timetableService.getDailySchedule(userId, targetDate);
    return res.status(200).json(schedule);
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
