import type { Request, Response } from "express";
import { prisma, type Frequency } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const startOfWeek = (date: Date): Date => {
    const d = startOfDay(date);
    const day = d.getDay(); // 0=Sun, 1=Mon
    const diff = (day === 0 ? -6 : 1) - day; // Monday as week start
    d.setDate(d.getDate() + diff);
    return d;
};

const getPeriodBounds = (frequency: Frequency, date: Date) => {
    if (frequency === "WEEKLY") {
        const start = startOfWeek(date);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        return { start, end };
    }

    const start = startOfDay(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
};

const getStreakStatus = (
    lastLogDate: Date | null,
    frequency: Frequency
): "inactive" | "active" | "broken" => {
    if (!lastLogDate) return "inactive";
    const { start, end } = getPeriodBounds(frequency, new Date());
    return lastLogDate >= start && lastLogDate < end ? "active" : "broken";
};

// Helper function to calculate streak
const calculateStreak = async (habitId: string): Promise<number> => {
    const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        include: { logs: { orderBy: { loggedAt: "desc" } } },
    });

    if (!habit || habit.logs.length === 0) return 0;

    const keys: number[] = [];
    for (const log of habit.logs) {
        const keyDate =
            habit.frequency === "WEEKLY"
                ? startOfWeek(log.loggedAt)
                : startOfDay(log.loggedAt);
        const key = keyDate.getTime();
        if (!keys.includes(key)) keys.push(key);
    }

    let streak = 0;
    const now = new Date();
    const startAnchor =
        habit.frequency === "WEEKLY" ? startOfWeek(now) : startOfDay(now);

    for (let i = 0; i < keys.length; i++) {
        const expected = new Date(startAnchor);
        expected.setDate(expected.getDate() - (habit.frequency === "WEEKLY" ? i * 7 : i));
        if (keys[i] === expected.getTime()) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
};

const logHabitCompletionInternal = async (params: {
    habitId: string;
    completedValue?: number;
    occurredAt?: Date;
}) => {
    const habit = await prisma.habit.findUnique({
        where: { id: params.habitId },
    });

    if (!habit) {
        return { status: "not_found" as const };
    }

    const occurredAt = params.occurredAt ?? new Date();
    const { start, end } = getPeriodBounds(habit.frequency, occurredAt);

    const existingLog = await prisma.habitLog.findFirst({
        where: {
            habitId: params.habitId,
            loggedAt: { gte: start, lt: end },
        },
    });

    if (existingLog) {
        return { status: "already_logged" as const, habit };
    }

    const log = await prisma.habitLog.create({
        data: {
            habitId: params.habitId,
            completedValue: params.completedValue ?? 1,
            loggedAt: occurredAt,
        },
    });

    const newStreak = await calculateStreak(params.habitId);
    const updatedHabit = await prisma.habit.update({
        where: { id: params.habitId },
        data: {
            currentStreak: newStreak,
            longestStreak: Math.max(habit.longestStreak, newStreak),
            lastLogDate: occurredAt,
        },
    });

    return { status: "logged" as const, habit: updatedHabit, log };
};

// Create Habit - POST /habits
export const createHabit = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { name, frequency, targetValue } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!name) {
            res.status(400).json({ message: "Habit name is required" });
            return;
        }

        const habit = await prisma.habit.create({
            data: {
                name,
                frequency: frequency || "DAILY",
                targetValue: targetValue || 1,
                userId,
            },
        });

        res.status(201).json({
            message: "Habit created successfully",
            habit,
        });
    } catch (error) {
        console.error("Error creating habit:", error);
        res.status(500).json({
            message: "Failed to create habit",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Log Completion - POST /habits/:id/log
export const logHabitCompletion = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const { completedValue } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Habit ID is required" });
            return;
        }   
        // Verify habit belongs to user
        const habit = await prisma.habit.findFirst({
            where: { id: id as string, userId },
        });

        if (!habit) {
            res.status(404).json({ message: "Habit not found" });
            return;
        }

        const result = await logHabitCompletionInternal({
            habitId: id as string,
            completedValue,
        });

        if (result.status === "already_logged") {
            res.status(400).json({
                message: "Habit already logged for this period",
            });
            return;
        }

        if (result.status === "not_found" || !result.habit) {
            res.status(404).json({ message: "Habit not found" });
            return;
        }

        res.status(201).json({
            message: "Habit logged successfully",
            log: result.log,
            habit: result.habit,
            streakStatus: "extended",
        });
    } catch (error) {
        console.error("Error logging habit:", error);
        res.status(500).json({
            message: "Failed to log habit",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Get All Habits - GET /habits
export const getAllHabits = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const habits = await prisma.habit.findMany({
            where: { userId },
            include: {
                logs: {
                    orderBy: { loggedAt: 'desc' },
                    take: 30, // Last 30 logs for quick stats
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Recalculate streaks for accuracy
        const habitsWithStreaks = await Promise.all(
            habits.map(async (habit) => {
                const currentStreak = await calculateStreak(habit.id);
                return {
                    ...habit,
                    currentStreak,
                    streakStatus: getStreakStatus(habit.lastLogDate, habit.frequency),
                };
            })
        );

        res.status(200).json({
            message: "Habits fetched successfully",
            habits: habitsWithStreaks,
        });
    } catch (error) {
        console.error("Error fetching habits:", error);
        res.status(500).json({
            message: "Failed to fetch habits",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Get Habit Stats - GET /habits/:id/stats
export const getHabitStats = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Habit ID is required" });
            return;
        }

        const habit = await prisma.habit.findFirst({
            where: { id: id as string, userId },
            include: {
                logs: {
                    orderBy: { loggedAt: 'desc' },
                },
            },
        });

        if (!habit) {
            res.status(404).json({ message: "Habit not found" });
            return;
        }

        // Calculate stats
        const totalCompletions = habit.logs?.length || 0;
        const currentStreak = await calculateStreak(id as string);

        // Prepare calendar heatmap data
        const heatmapData = (habit.logs || []).map((log: any) => ({
            date: log.loggedAt.toISOString().split('T')[0],
            value: log.completedValue,
        }));

        // Calculate completion rate for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentLogs = (habit.logs || []).filter(
            (log: any) => log.loggedAt >= thirtyDaysAgo
        );
        const completionRate = (recentLogs.length / 30) * 100;

        res.status(200).json({
            message: "Habit stats fetched successfully",
            stats: {
                habit: {
                    id: habit.id,
                    name: habit.name,
                    frequency: habit.frequency,
                    targetValue: habit.targetValue,
                },
                currentStreak,
                longestStreak: habit.longestStreak,
                totalCompletions,
                completionRate: Math.round(completionRate * 10) / 10,
                lastLogDate: habit.lastLogDate,
                streakStatus: getStreakStatus(habit.lastLogDate, habit.frequency),
                heatmapData,
            },
        });
    } catch (error) {
        console.error("Error fetching habit stats:", error);
        res.status(500).json({
            message: "Failed to fetch habit stats",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Update Habit - PUT /habits/:id
export const updateHabit = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, frequency, targetValue } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Habit ID is required" });
            return;
        }

        const habit = await prisma.habit.findFirst({
            where: { id: id as string, userId },
        });

        if (!habit) {
            res.status(404).json({ message: "Habit not found" });
            return;
        }

        const updatedHabit = await prisma.habit.update({
            where: { id: id as string },
            data: {
                name: name ?? habit.name,
                frequency: frequency ?? habit.frequency,
                targetValue: targetValue ?? habit.targetValue,
            },
        });

        const currentStreak = await calculateStreak(updatedHabit.id);

        res.status(200).json({
            message: "Habit updated successfully",
            habit: {
                ...updatedHabit,
                currentStreak,
                streakStatus: getStreakStatus(
                    updatedHabit.lastLogDate,
                    updatedHabit.frequency
                ),
            },
        });
    } catch (error) {
        console.error("Error updating habit:", error);
        res.status(500).json({
            message: "Failed to update habit",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Delete Habit - DELETE /habits/:id
export const deleteHabit = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Habit ID is required" });
            return;
        }

        const habit = await prisma.habit.findFirst({
            where: { id: id as string, userId },
        });

        if (!habit) {
            res.status(404).json({ message: "Habit not found" });
            return;
        }

        await prisma.habit.delete({ where: { id: id as string } });

        res.status(200).json({
            message: "Habit deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting habit:", error);
        res.status(500).json({
            message: "Failed to delete habit",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Async Events - POST /habits/events
export const handleHabitEvent = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { type, habitId, completedValue, occurredAt } = req.body ?? {};

        if (!type || !habitId || typeof habitId !== "string") {
            res.status(400).json({ message: "Invalid event payload" });
            return;
        }

        if (type !== "TaskCompleted") {
            res.status(200).json({ message: "Event ignored" });
            return;
        }

        const eventOccurredAt = occurredAt ? new Date(occurredAt) : undefined;
        const result = await logHabitCompletionInternal({
            habitId,
            completedValue,
            ...(eventOccurredAt ? { occurredAt: eventOccurredAt } : {}),
        });

        if (result.status === "not_found") {
            res.status(404).json({ message: "Habit not found" });
            return;
        }

        if (result.status === "already_logged") {
            res.status(200).json({ message: "Habit already logged" });
            return;
        }

        res.status(200).json({
            message: "Habit updated from event",
            habit: result.habit,
            log: result.log,
        });
    } catch (error) {
        console.error("Error handling habit event:", error);
        res.status(500).json({
            message: "Failed to process habit event",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Reset Habit - POST /habits/:id/reset
export const resetHabit = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Habit ID is required" });
            return;
        }

        const habit = await prisma.habit.findFirst({
            where: { id: id as string, userId },
        });

        if (!habit) {
            res.status(404).json({ message: "Habit not found" });
            return;
        }

        const updatedHabit = await prisma.habit.update({
            where: { id: id as string },
            data: {
                currentStreak: 0,
                lastLogDate: null,
            },
        });

        res.status(200).json({
            message: "Habit streak reset successfully",
            habit: updatedHabit,
        });
    } catch (error) {
        console.error("Error resetting habit:", error);
        res.status(500).json({
            message: "Failed to reset habit",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
