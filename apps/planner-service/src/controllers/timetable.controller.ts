
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { timetableService } from "../services/timetable.service.js";

export const getDailySchedule = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { date } = req.query;
        const targetDate = date ? new Date(date as string) : new Date();

        if (isNaN(targetDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        const schedule = await timetableService.getDailySchedule(req.user.id, targetDate);

        return res.status(200).json(schedule);
    } catch (error) {
        console.error("Get daily schedule error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
