import type { Request, Response } from "express";
import { prisma } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatDateKey = (date: Date): string => {
    return date.toISOString().split("T")[0]!;
};

// Daily Summary - GET /stats/daily
export const getDailySummary = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const dailyGoalHours = req.user?.dailyGoalHours ?? 0;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const start = startOfDay(new Date());
        const end = new Date(start);
        end.setDate(start.getDate() + 1);

        const summary = await prisma.activityLog.aggregate({
            _sum: { durationMinutes: true },
            where: {
                task: { userId },
                startTime: { gte: start, lt: end },
            },
        });

        const totalMinutes = summary._sum.durationMinutes ?? 0;
        const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

        res.status(200).json({
            message: "Daily summary fetched successfully",
            stats: {
                totalMinutes,
                totalHours,
                dailyGoalHours,
                remainingHours: Math.max(0, dailyGoalHours - totalHours),
            },
        });
    } catch (error) {
        console.error("Error fetching daily summary:", error);
        res.status(500).json({
            message: "Failed to fetch daily summary",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Weekly Trends - GET /stats/weekly
export const getWeeklyTrends = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const today = startOfDay(new Date());
        const start = new Date(today);
        start.setDate(today.getDate() - 6);

        const logs = await prisma.activityLog.findMany({
            where: {
                task: { userId },
                startTime: { gte: start },
            },
            select: { startTime: true, durationMinutes: true },
        });

        const totals = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            totals.set(formatDateKey(day), 0);
        }

        for (const log of logs) {
            const key = formatDateKey(startOfDay(log.startTime));
            const current = totals.get(key) ?? 0;
            totals.set(key, current + (log.durationMinutes ?? 0));
        }

        const data = Array.from(totals.entries()).map(([date, minutes]) => ({
            date,
            minutes,
            hours: Math.round((minutes / 60) * 10) / 10,
        }));

        res.status(200).json({
            message: "Weekly trends fetched successfully",
            data,
        });
    } catch (error) {
        console.error("Error fetching weekly trends:", error);
        res.status(500).json({
            message: "Failed to fetch weekly trends",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Task Efficiency - GET /stats/task/:id
export const getTaskEfficiency = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Task ID is required" });
            return;
        }

        const task = await prisma.task.findFirst({
            where: { id, userId },
            include: { activityLogs: true },
        });

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        const totalMinutes = task.activityLogs.reduce(
            (sum, log) => sum + (log.durationMinutes ?? 0),
            0
        );

        const similarTasks = await prisma.task.findMany({
            where: {
                userId,
                title: task.title,
                status: "COMPLETED",
            },
            include: { activityLogs: true },
        });

        const averageMinutes =
            similarTasks.length > 0
                ? Math.round(
                      similarTasks.reduce((sum, t) => {
                          const minutes = t.activityLogs.reduce(
                              (innerSum, log) =>
                                  innerSum + (log.durationMinutes ?? 0),
                              0
                          );
                          return sum + minutes;
                      }, 0) / similarTasks.length
                  )
                : null;

        res.status(200).json({
            message: "Task efficiency fetched successfully",
            stats: {
                taskId: task.id,
                title: task.title,
                status: task.status,
                totalMinutes,
                totalHours: Math.round((totalMinutes / 60) * 10) / 10,
                predictedMinutes: averageMinutes,
            },
        });
    } catch (error) {
        console.error("Error fetching task efficiency:", error);
        res.status(500).json({
            message: "Failed to fetch task efficiency",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Focus Score - GET /stats/focus
export const getFocusScore = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);

        const sessions = await prisma.activityLog.findMany({
            where: {
                task: { userId },
                startTime: { gte: start, lt: end },
            },
            select: { durationMinutes: true },
        });

        const totalSessions = sessions.length;
        const totalMinutes = sessions.reduce(
            (sum, s) => sum + (s.durationMinutes ?? 0),
            0
        );

        const sessionsPerDay = totalSessions / 7;
        const hoursPerDay = totalMinutes / 60 / 7;

        const score = Math.min(
            100,
            Math.round(sessionsPerDay * 15 + hoursPerDay * 10)
        );

        res.status(200).json({
            message: "Focus score calculated successfully",
            stats: {
                score,
                totalSessions,
                totalMinutes,
                sessionsPerDay: Math.round(sessionsPerDay * 10) / 10,
                hoursPerDay: Math.round(hoursPerDay * 10) / 10,
            },
        });
    } catch (error) {
        console.error("Error calculating focus score:", error);
        res.status(500).json({
            message: "Failed to calculate focus score",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Event Handler - POST /events/task-completed
export const handleTaskCompletedEvent = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { type, taskId } = req.body ?? {};

        if (type !== "TASK_COMPLETED" || !taskId || typeof taskId !== "string") {
            res.status(400).json({ message: "Invalid event payload" });
            return;
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { activityLogs: true },
        });

        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }

        const totalMinutes = task.activityLogs.reduce(
            (sum, log) => sum + (log.durationMinutes ?? 0),
            0
        );

        const completionStat = await prisma.taskCompletionStat.upsert({
            where: { taskId: task.id },
            create: {
                taskId: task.id,
                userId: task.userId,
                totalMinutes,
                completedAt: new Date(),
            },
            update: {
                totalMinutes,
                completedAt: new Date(),
            },
        });

        res.status(200).json({
            message: "Task completion processed",
            stats: {
                taskId: task.id,
                title: task.title,
                totalMinutes,
                totalHours: Math.round((totalMinutes / 60) * 10) / 10,
            },
            completionStat,
        });
    } catch (error) {
        console.error("Error processing task completion event:", error);
        res.status(500).json({
            message: "Failed to process task completion event",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
