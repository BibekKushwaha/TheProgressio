import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { timetableService } from "../services/timetable.service.js";

const parseDateInput = (value: unknown): Date | null => {
    if (typeof value !== "string" || !value.trim()) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const ensureUserId = (req: AuthenticatedRequest, res: Response): string | null => {
    if (!req.user?.id) {
        res.status(401).json({ message: "Unauthorized" });
        return null;
    }
    return req.user.id;
};

// GET /timetable/daily
export const getDailySchedule = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = ensureUserId(req, res);
        if (!userId) return;

        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        if (Number.isNaN(targetDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        const schedule = await timetableService.getDailySchedule(userId, targetDate);
        return res.status(200).json(schedule);
    } catch (error) {
        console.error("Get daily schedule error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// GET /timetable/holidays
export const listHolidays = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = ensureUserId(req, res);
        if (!userId) return;

        const holidays = await timetableService.listHolidays(userId);
        return res.status(200).json({ holidays });
    } catch (error) {
        console.error("List holidays error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// POST /timetable/holidays
export const createHoliday = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = ensureUserId(req, res);
        if (!userId) return;

        const { name, startDate, endDate, pauseNotifications } = req.body ?? {};

        if (!name || typeof name !== "string") {
            return res.status(400).json({ message: "name is required" });
        }

        const parsedStart = parseDateInput(startDate);
        const parsedEnd = parseDateInput(endDate);
        if (!parsedStart || !parsedEnd) {
            return res.status(400).json({ message: "startDate and endDate are required in ISO date format" });
        }

        if (parsedEnd < parsedStart) {
            return res.status(400).json({ message: "endDate cannot be before startDate" });
        }

        const holiday = await timetableService.createHoliday({
            userId,
            name: name.trim(),
            startDate: parsedStart,
            endDate: parsedEnd,
            pauseNotifications: typeof pauseNotifications === "boolean" ? pauseNotifications : true,
        });

        return res.status(201).json({ holiday });
    } catch (error) {
        console.error("Create holiday error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// PATCH /timetable/holidays/:id
export const updateHoliday = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = ensureUserId(req, res);
        if (!userId) return;

        const { id } = req.params;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid holiday id" });
        }

        const { name, startDate, endDate, pauseNotifications } = req.body ?? {};
        const parsedStart = startDate !== undefined ? parseDateInput(startDate) : undefined;
        const parsedEnd = endDate !== undefined ? parseDateInput(endDate) : undefined;
        if ((startDate !== undefined && !parsedStart) || (endDate !== undefined && !parsedEnd)) {
            return res.status(400).json({ message: "Invalid date format for startDate/endDate" });
        }

        if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
            return res.status(400).json({ message: "endDate cannot be before startDate" });
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
            return res.status(404).json({ message: "Holiday not found" });
        }

        return res.status(200).json({ message: "Holiday updated" });
    } catch (error) {
        console.error("Update holiday error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /timetable/holidays/:id
export const deleteHoliday = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = ensureUserId(req, res);
        if (!userId) return;

        const { id } = req.params;
        if (!id || typeof id !== "string") {
            return res.status(400).json({ message: "Invalid holiday id" });
        }

        const removed = await timetableService.deleteHoliday({ id, userId });
        if (removed.count === 0) {
            return res.status(404).json({ message: "Holiday not found" });
        }

        return res.status(200).json({ message: "Holiday deleted" });
    } catch (error) {
        console.error("Delete holiday error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
