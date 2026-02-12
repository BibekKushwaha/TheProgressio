import type { Request, Response } from "express";
import { prisma, type Frequency } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
    calculateGentleStreak,
    awardXP,
    XP_REWARDS,
    getStreakBonusXP,
    getYearlyHeatmap,
    calculateLevel,
    xpToNextLevel,
} from "../services/streak.service.js";
import {
    detectStreakRisks,
    detectExamWarnings,
    generateMorningBriefing,
    detectSlipPatterns,
    getUserNudges,
    markNudgeRead,
    markAllNudgesRead,
} from "../services/nudge.service.js";

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

    let existingLog = await prisma.habitLog.findFirst({
        where: {
            habitId: params.habitId,
            loggedAt: { gte: start, lt: end },
        },
    });

    const appearsResetState =
        habit.lastLogDate === null ||
        (
            habit.currentStreak === 0 &&
            habit.longestStreak === 0 &&
            habit.mercyDaysUsed === 0 &&
            habit.lastLogDate !== null &&
            habit.lastLogDate < start
        );

    // Self-heal: if habit was reset but stale period logs still exist, clear logs and allow check-in.
    if (existingLog && appearsResetState) {
        await prisma.habitLog.deleteMany({
            where: { habitId: params.habitId },
        });
        existingLog = null;
    }

    if (existingLog) {
        return { status: "already_logged" as const, habit, log: existingLog };
    }

    const log = await prisma.habitLog.create({
        data: {
            habitId: params.habitId,
            completedValue: params.completedValue ?? 1,
            loggedAt: occurredAt,
        },
    });

    // Use Gentle Streak engine
    const streakResult = await calculateGentleStreak(params.habitId);
    const updatedHabit = await prisma.habit.update({
        where: { id: params.habitId },
        data: {
            currentStreak: streakResult.currentStreak,
            longestStreak: streakResult.longestStreak,
            mercyDaysUsed: streakResult.mercyDaysUsed,
            lastLogDate: occurredAt,
        },
    });

    // Award XP for habit completion
    try {
        const bonusXP = getStreakBonusXP(streakResult.currentStreak);
        await awardXP(habit.userId, XP_REWARDS.HABIT_LOG + bonusXP);
    } catch (_e) { /* XP is non-critical */ }

    return { status: "logged" as const, habit: updatedHabit, log, streakResult };
};

// Create Habit - POST /habits
export const createHabit = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const { name, frequency, targetValue, icon, color, mercyDaysAllowed, linkedCategoryId } = req.body;
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
                icon,
                color,
                userId,
                mercyDaysAllowed: mercyDaysAllowed ?? 1,
                linkedCategoryId: linkedCategoryId ?? null,
            },
        });

        res.status(201).json({
            message: "Habit created successfully",
            habit: {
                ...habit,
                streakStatus: "inactive",
                streakHealth: "broken",
                mercyDaysUsed: 0,
                isMercyActive: false,
            },
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
            res.status(200).json({
                message: "Habit already logged for this period",
                log: result.log,
                habit: result.habit,
                streakStatus: getStreakStatus(result.habit.lastLogDate, result.habit.frequency),
                alreadyLogged: true,
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
            streakStatus: getStreakStatus(result.habit.lastLogDate, result.habit.frequency),
            streakHealth: result.streakResult?.streakHealth ?? "strong",
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

        // Recalculate streaks using Gentle Streak engine
        const habitsWithStreaks = await Promise.all(
            habits.map(async (habit) => {
                const streakResult = await calculateGentleStreak(habit.id);
                return {
                    ...habit,
                    currentStreak: streakResult.currentStreak,
                    streakStatus: getStreakStatus(habit.lastLogDate, habit.frequency),
                    streakHealth: streakResult.streakHealth,
                    mercyDaysUsed: streakResult.mercyDaysUsed,
                    isMercyActive: streakResult.isMercyActive,
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

        // Calculate stats using Gentle Streak
        const totalCompletions = habit.logs?.length || 0;
        const streakResult = await calculateGentleStreak(id as string);

        // Prepare calendar heatmap data (365 days)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const heatmapData = (habit.logs || [])
            .filter((log: any) => log.loggedAt >= oneYearAgo)
            .map((log: any) => ({
                date: log.loggedAt.toISOString().split('T')[0],
                value: log.completedValue,
            }));

        // Calculate completion rate for last 30 days
        const daysToCheck = 30;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - daysToCheck);

        const recentLogs = (habit.logs || []).filter(
            (log: any) => log.loggedAt >= thirtyDaysAgo
        );

        let expectedCompletions = daysToCheck;
        if (habit.frequency === 'WEEKLY') {
            // Calculate how many week-starts were in the last 30 days
            expectedCompletions = Math.ceil(daysToCheck / 7);
        }

        const completionRate = Math.min(recentLogs.length / expectedCompletions, 1);

        res.status(200).json({
            message: "Habit stats fetched successfully",
            stats: {
                habit: {
                    id: habit.id,
                    name: habit.name,
                    frequency: habit.frequency,
                    targetValue: habit.targetValue,
                    mercyDaysAllowed: habit.mercyDaysAllowed,
                },
                currentStreak: streakResult.currentStreak,
                longestStreak: streakResult.longestStreak,
                streakHealth: streakResult.streakHealth,
                mercyDaysUsed: streakResult.mercyDaysUsed,
                isMercyActive: streakResult.isMercyActive,
                totalCompletions,
                completionRate: Math.round(completionRate * 1000) / 1000,
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
        const { name, frequency, targetValue, icon, color, mercyDaysAllowed, linkedCategoryId } = req.body;
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
                icon: icon ?? habit.icon,
                color: color ?? habit.color,
                mercyDaysAllowed: mercyDaysAllowed ?? habit.mercyDaysAllowed,
                linkedCategoryId: linkedCategoryId !== undefined ? linkedCategoryId : habit.linkedCategoryId,
            },
        });

        const streakResult = await calculateGentleStreak(updatedHabit.id);

        res.status(200).json({
            message: "Habit updated successfully",
            habit: {
                ...updatedHabit,
                currentStreak: streakResult.currentStreak,
                streakStatus: getStreakStatus(updatedHabit.lastLogDate, updatedHabit.frequency),
                streakHealth: streakResult.streakHealth,
                mercyDaysUsed: streakResult.mercyDaysUsed,
                isMercyActive: streakResult.isMercyActive,
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

        const [, updatedHabit] = await prisma.$transaction([
            prisma.habitLog.deleteMany({
                where: { habitId: id as string },
            }),
            prisma.habit.update({
                where: { id: id as string },
                data: {
                    currentStreak: 0,
                    longestStreak: 0,
                    mercyDaysUsed: 0,
                    lastLogDate: null,
                },
            }),
        ]);

        res.status(200).json({
            message: "Habit streak reset successfully",
            habit: {
                ...updatedHabit,
                streakStatus: "inactive",
                streakHealth: "broken",
                mercyDaysUsed: 0,
                isMercyActive: false,
            },
        });
    } catch (error) {
        console.error("Error resetting habit:", error);
        res.status(500).json({
            message: "Failed to reset habit",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// ── XP & Gamification ──────────────────────────────────────────────────

// GET /habits/xp — Get user XP, level, and progress
export const getUserXP = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { xp: true, level: true },
        });
        if (!user) { res.status(404).json({ message: "User not found" }); return; }

        const xp = user.xp ?? 0;
        const level = calculateLevel(xp);
        const progress = xpToNextLevel(xp);
        const LEVEL_NAMES = [
            "Novice",
            "Apprentice",
            "Disciplined",
            "Focused",
            "Consistent",
            "Performer",
            "Strategist",
            "Achiever",
            "Master",
            "Legend",
        ];
        const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)] ?? "Novice";

        res.status(200).json({
            message: "XP fetched successfully",
            xp: {
                xp,
                level,
                levelName,
                xpToNextLevel: Math.max(0, progress.next - xp),
                progress: progress.progress,
                currentLevelXP: progress.current,
                nextLevelXP: progress.next,
            },
        });
    } catch (error) {
        console.error("Error fetching XP:", error);
        res.status(500).json({ message: "Failed to fetch XP", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ── 365-Day Contribution Heatmap ───────────────────────────────────────

// GET /habits/heatmap — GitHub-style yearly contribution heatmap
export const getContributionHeatmap = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const heatmap = await getYearlyHeatmap(userId);
        const totalContributions = heatmap.reduce((sum, d) => sum + d.count, 0);
        const activeDays = heatmap.filter(d => d.count > 0).length;

        res.status(200).json({
            message: "Heatmap generated successfully",
            heatmap,
            summary: {
                totalContributions,
                activeDays,
                totalDays: heatmap.length,
                consistencyRate: Math.round((activeDays / heatmap.length) * 100),
            },
        });
    } catch (error) {
        console.error("Error generating heatmap:", error);
        res.status(500).json({ message: "Failed to generate heatmap", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ── Nudges ─────────────────────────────────────────────────────────────

// GET /habits/nudges — Adaptive smart nudges
export const getNudges = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        // Generate fresh nudges before fetching
        await detectStreakRisks(userId);
        await detectExamWarnings(userId);

        const unreadOnly = req.query.unread === "true";
        const nudges = await getUserNudges(userId, unreadOnly);

        res.status(200).json({ message: "Nudges fetched", nudges });
    } catch (error) {
        console.error("Error fetching nudges:", error);
        res.status(500).json({ message: "Failed to fetch nudges", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// POST /habits/nudges/:id/read — Mark nudge as read
export const markNudgeAsRead = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        await markNudgeRead(id as string, userId);
        res.status(200).json({ message: "Nudge marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to mark nudge", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// POST /habits/nudges/read-all — Mark all nudges as read
export const markAllNudgesAsRead = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        await markAllNudgesRead(userId);
        res.status(200).json({ message: "All nudges marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Failed to mark nudges", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /habits/briefing — Morning briefing
export const getMorningBriefing = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const briefing = await generateMorningBriefing(userId);
        const slipDetection = await detectSlipPatterns(userId);

        res.status(200).json({
            message: "Morning briefing generated",
            briefing,
            slipDetection,
        });
    } catch (error) {
        console.error("Error generating briefing:", error);
        res.status(500).json({ message: "Failed to generate briefing", error: error instanceof Error ? error.message : "Unknown error" });
    }
};
