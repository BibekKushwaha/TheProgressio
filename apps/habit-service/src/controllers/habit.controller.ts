import type { Request, Response } from "express";
import { prisma, type Frequency } from "@repo/db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { habitSchema, habitLogSchema } from "@repo/schemas/habit";
import { notificationSettingsPatchSchema } from "@repo/schemas/nudge";
import ErrorHandler from "../utils/errorHandler.js";
import { TryCatch } from "../utils/tryCatch.js";
import {
    calculateGentleStreak,
    awardXP,
    XP_REWARDS,
    getStreakBonusXP,
    getYearlyHeatmap,
    autoLogHabitFromCategory,
    calculateLevel,
    xpToNextLevel,
} from "../services/streak.service.js";
import {
    detectStreakRisks,
    detectExamWarnings,
    generateMorningBriefing,
    detectSlipPatterns,
    createTransactionSystemNudge,
    getNotificationSettings,
    getUserNudges,
    markNudgeRead,
    markAllNudgesRead,
    upsertNotificationSettings,
    reschedulePendingStreakNudges,
} from "../services/nudge.service.js";
import { dispatchWhatsAppNudges } from "../services/whatsapp-outbound.service.js";
import { enqueueDueNudgeDispatchJobs, cancelPendingWhatsAppFallbackJobsForUser } from "../services/nudge-dispatch.queue.js";
import { getMetricsSnapshot, incrementMetric, logMetricEvent } from "../services/metrics.service.js";

const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const startOfWeek = (date: Date): Date => {
    const d = startOfDay(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d;
};

const getPeriodBounds = (frequency: Frequency, date: Date) => {
    const start = frequency === "WEEKLY" ? startOfWeek(date) : startOfDay(date);
    const end = new Date(start);
    end.setDate(start.getDate() + (frequency === "WEEKLY" ? 7 : 1));
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

// Internal helper for analytics service to merge habit activity into streaks
// GET /api/habits/internal/active-dates?userId=...
export const getInternalActiveDates = TryCatch(async (req: Request, res: Response): Promise<void> => {
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    if (!userId) {
        throw new ErrorHandler(400, "userId is required");
    }

    const logs = await prisma.habitLog.findMany({
        where: { habit: { userId } },
        select: { loggedAt: true },
        orderBy: { loggedAt: "desc" },
        take: 1000, // Increased limit for better historical view
    });

    const activeDates = Array.from(new Set(logs.map((log) => log.loggedAt.toISOString().split("T")[0])));
    res.status(200).json({ message: "Habit active dates fetched", userId, activeDates });
});

// Internal helper to cancel pending WA fallback jobs when user becomes active
// POST /api/habits/internal/wa-fallback/cancel
export const cancelInternalWhatsAppFallback = TryCatch(async (req: Request, res: Response): Promise<void> => {
    const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
    const source = typeof req.body?.source === "string" ? req.body.source.trim() : "internal";
    if (!userId) {
        throw new ErrorHandler(400, "userId is required");
    }

    const result = await cancelPendingWhatsAppFallbackJobsForUser(userId);
    if (result.cancelled > 0) {
        incrementMetric("wa_fallback_cancelled_by_activity", result.cancelled);
        logMetricEvent("wa_fallback_cancelled_by_activity", {
            userId,
            source,
            cancelled: result.cancelled,
        });
    }
    res.status(200).json({
        message: "Pending WhatsApp fallback jobs cancelled",
        userId,
        source,
        ...result,
    });
});

// Internal helper for lightweight nudge/dispatch counters
// GET /api/habits/internal/metrics
export const getInternalMetrics = TryCatch(async (req: Request, res: Response): Promise<void> => {
    const keysQuery = Array.isArray(req.query.keys) ? req.query.keys[0] : req.query.keys;
    res.status(200).json({
        message: "Internal metrics snapshot",
        generatedAt: new Date().toISOString(),
        metrics: (() => {
            const snapshot = getMetricsSnapshot();
            if (typeof keysQuery !== "string" || keysQuery.trim().length === 0) {
                return snapshot;
            }

            const requestedKeys = Array.from(
                new Set(
                    keysQuery
                        .split(",")
                        .map((key) => key.trim())
                        .filter((key) => key.length > 0)
                        .slice(0, 25),
                ),
            );

            const filtered: Record<string, number> = {};
            for (const key of requestedKeys) {
                if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
                    filtered[key] = snapshot[key] as number;
                }
            }
            return filtered;
        })(),
    });
});

// Helper function to calculate streak (internal backup)
const _calculateStreak = async (habitId: string): Promise<number> => {
    const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        include: { logs: { orderBy: { loggedAt: "desc" } } },
    });

    if (!habit || habit.logs.length === 0) return 0;

    const uniqueDays = new Set<number>();
    for (const log of habit.logs) {
        const d = habit.frequency === "WEEKLY" ? startOfWeek(log.loggedAt) : startOfDay(log.loggedAt);
        uniqueDays.add(d.getTime());
    }

    const sortedDays = Array.from(uniqueDays).sort((a, b) => b - a);
    let streak = 0;
    const now = new Date();
    const anchor = habit.frequency === "WEEKLY" ? startOfWeek(now) : startOfDay(now);

    for (let i = 0; i < sortedDays.length; i++) {
        const expected = new Date(anchor);
        expected.setDate(expected.getDate() - (habit.frequency === "WEEKLY" ? i * 7 : i));
        if (sortedDays[i] === expected.getTime()) {
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
export const createHabit = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    const { name, frequency, targetValue, icon, color, mercyDaysAllowed, linkedCategoryId } = req.body;

    const parsed = habitSchema.safeParse({
        name,
        frequency,
        targetValue,
        icon,
        color,
        mercyDaysAllowed,
        categoryId: linkedCategoryId || undefined,
    });

    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid habit data");
    }

    const habit = await prisma.habit.create({
        data: {
            name: parsed.data.name,
            frequency: (parsed.data.frequency as Frequency) || "DAILY",
            targetValue: parsed.data.targetValue || 1,
            icon: parsed.data.icon ?? null,
            color: parsed.data.color ?? null,
            userId,
            mercyDaysAllowed: parsed.data.mercyDaysAllowed ?? 1,
            linkedCategoryId: (parsed.data as any).categoryId ?? null,
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
});

// Log Completion - POST /habits/:id/log
export const logHabitCompletion = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    const { id } = req.params;
    const { completedValue } = req.body;

    if (!id) {
        throw new ErrorHandler(400, "Habit ID is required");
    }

    const logParsed = habitLogSchema.pick({ completedValue: true }).safeParse({
        completedValue: completedValue ?? 1,
    });

    if (!logParsed.success) {
        throw new ErrorHandler(400, "Invalid completion value");
    }

    // Verify habit belongs to user
    const habit = await prisma.habit.findFirst({
        where: { id: id as string, userId },
    });

    if (!habit) {
        throw new ErrorHandler(404, "Habit not found");
    }

    const result = await logHabitCompletionInternal({
        habitId: id as string,
        completedValue: logParsed.data.completedValue,
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
        throw new ErrorHandler(404, "Habit not found");
    }

    try {
        await createTransactionSystemNudge({
            userId,
            title: `Progress recorded for ${result.habit.name}`,
            message: `Nice work — your ${result.habit.name} update is saved and reflected in your streak insights.`,
            metadata: {
                habitId: result.habit.id,
                event: "habit_log_recorded",
            },
        });
    } catch (_nudgeError) {
        // Non-critical
    }

    res.status(201).json({
        message: "Habit logged successfully",
        log: result.log,
        habit: result.habit,
        streakStatus: getStreakStatus(result.habit.lastLogDate, result.habit.frequency),
        streakHealth: result.streakResult?.streakHealth ?? "strong",
    });
});

// Get All Habits - GET /habits
export const getAllHabits = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    const habits = await prisma.habit.findMany({
        where: { userId },
        include: {
            logs: {
                orderBy: { loggedAt: 'desc' },
                take: 30,
            },
        },
        orderBy: { createdAt: 'desc' },
    });

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
});

// Get Habit Stats - GET /habits/:id/stats
export const getHabitStats = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Habit ID is required");
    }

    const habit = await prisma.habit.findFirst({
        where: { id, userId },
        include: {
            logs: { orderBy: { loggedAt: 'desc' } },
        },
    });

    if (!habit) {
        throw new ErrorHandler(404, "Habit not found");
    }

    const totalCompletions = habit.logs?.length || 0;
    const streakResult = await calculateGentleStreak(id);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const heatmapData = (habit.logs || [])
        .filter((log: any) => log.loggedAt >= oneYearAgo)
        .map((log: any) => ({
            date: log.loggedAt.toISOString().split('T')[0],
            value: log.completedValue,
        }));

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = (habit.logs || []).filter(
        (log: any) => log.loggedAt >= thirtyDaysAgo
    );

    const createdDate = new Date(habit.createdAt);
    const effectiveStartDate = createdDate > thirtyDaysAgo ? createdDate : thirtyDaysAgo;
    const diffDays = Math.ceil((now.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const activeWindowDays = Math.max(1, diffDays);

    let expectedCompletions = activeWindowDays;
    if (habit.frequency === 'WEEKLY') {
        expectedCompletions = Math.ceil(activeWindowDays / 7);
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
});

// Update Habit - PUT /habits/:id
export const updateHabit = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Habit ID is required");
    }

    const parsed = habitSchema.partial().safeParse(req.body);
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid habit update data");
    }

    const { name, frequency, targetValue, icon, color, mercyDaysAllowed, categoryId: linkedCategoryId } = parsed.data;

    const habit = await prisma.habit.findFirst({
        where: { id, userId },
    });

    if (!habit) {
        throw new ErrorHandler(404, "Habit not found");
    }

    const updatedHabit = await prisma.habit.update({
        where: { id },
        data: {
            name: name ?? habit.name,
            frequency: (frequency as Frequency) ?? habit.frequency,
            targetValue: targetValue ?? habit.targetValue,
            icon: icon === undefined ? habit.icon : icon,
            color: color === undefined ? habit.color : color,
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
});

// Delete Habit - DELETE /habits/:id
export const deleteHabit = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const id = req.params.id as string; // Explicitly cast to string
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Habit ID is required");
    }

    const habit = await prisma.habit.findFirst({
        where: { id, userId },
    });

    if (!habit) {
        throw new ErrorHandler(404, "Habit not found");
    }

    await prisma.habit.delete({ where: { id } });

    res.status(200).json({ message: "Habit deleted successfully" });
});

// Async Events - POST /habits/events
export const handleHabitEvent = TryCatch(async (
    req: Request,
    res: Response
): Promise<void> => {
    const { type, habitId, userId, categoryId, completedValue, occurredAt } = req.body ?? {};

    if (!type) {
        throw new ErrorHandler(400, "Invalid event payload");
    }

    if (type !== "TaskCompleted") {
        res.status(200).json({ message: "Event ignored" });
        return;
    }

    if (typeof categoryId === "string" && categoryId && typeof userId === "string" && userId) {
        await autoLogHabitFromCategory(userId, categoryId);
        res.status(200).json({ message: "Linked habits auto-logged" });
        return;
    }

    if (!habitId || typeof habitId !== "string") {
        throw new ErrorHandler(400, "Invalid event payload");
    }

    const eventOccurredAt = occurredAt ? new Date(occurredAt) : undefined;
    const result = await logHabitCompletionInternal({
        habitId,
        completedValue,
        ...(eventOccurredAt ? { occurredAt: eventOccurredAt } : {}),
    });

    if (result.status === "not_found") {
        throw new ErrorHandler(404, "Habit not found");
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
});

// Reset Habit - POST /habits/:id/reset
export const resetHabit = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    if (!id || typeof id !== "string") {
        throw new ErrorHandler(400, "Habit ID is required");
    }

    const habit = await prisma.habit.findFirst({
        where: { id, userId },
    });

    if (!habit) {
        throw new ErrorHandler(404, "Habit not found");
    }

    const [, updatedHabit] = await prisma.$transaction([
        prisma.habitLog.deleteMany({
            where: { habitId: id },
        }),
        prisma.habit.update({
            where: { id },
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
});

// ── XP & Gamification ──────────────────────────────────────────────────

// GET /habits/xp — Get user XP, level, and progress
export const getUserXP = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, level: true },
    });
    if (!user) {
        throw new ErrorHandler(404, "User not found");
    }

    const xp = user.xp ?? 0;
    const level = calculateLevel(xp);
    const progress = xpToNextLevel(xp);
    const LEVEL_NAMES = [
        "Novice", "Apprentice", "Disciplined", "Focused", "Consistent",
        "Performer", "Strategist", "Achiever", "Master", "Legend",
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
});

// ── 365-Day Contribution Heatmap ───────────────────────────────────────

// GET /habits/heatmap — GitHub-style yearly contribution heatmap
export const getContributionHeatmap = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
    });

    if (!user) {
        throw new ErrorHandler(404, "User not found");
    }

    const heatmap = await getYearlyHeatmap(userId);
    const totalContributions = heatmap.reduce((sum, d) => sum + d.count, 0);
    const activeDays = heatmap.filter(d => d.count > 0).length;

    const accountAgeDays = Math.ceil((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const relevantTotalDays = Math.max(1, Math.min(heatmap.length, accountAgeDays));

    res.status(200).json({
        message: "Heatmap generated successfully",
        heatmap,
        summary: {
            totalContributions,
            activeDays,
            totalDays: relevantTotalDays,
            consistencyRate: Math.round((activeDays / relevantTotalDays) * 100),
        },
    });
});

// ── Nudges ─────────────────────────────────────────────────────────────

// GET /habits/nudges — Adaptive smart nudges
export const getNudges = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    // Generate fresh nudges before fetching
    await detectStreakRisks(userId).catch(() => { });
    await detectExamWarnings(userId).catch(() => { });

    const unreadOnly = req.query.unread === "true";
    const nudges = await getUserNudges(userId, unreadOnly);

    res.status(200).json({ message: "Nudges fetched", nudges });
});

// POST /habits/nudges/:id/read — Mark nudge as read
export const markNudgeAsRead = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }
    if (!id) {
        throw new ErrorHandler(400, "Nudge ID is required");
    }

    await markNudgeRead(id as string, userId);
    res.status(200).json({ message: "Nudge marked as read" });
});

// POST /habits/nudges/read-all — Mark all nudges as read
export const markAllNudgesAsRead = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    await markAllNudgesRead(userId);
    res.status(200).json({ message: "All nudges marked as read" });
});

// GET /habits/nudges/settings — Fetch notification controls
export const getNudgeSettings = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response,
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    const settings = await getNotificationSettings(userId);
    res.status(200).json({ message: "Notification settings fetched", settings });
});

// PUT /habits/nudges/settings — Update notification controls
export const updateNudgeSettings = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response,
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    const parsed = notificationSettingsPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid notification settings payload");
    }

    const settings = await upsertNotificationSettings(userId, parsed.data as any);
    if (parsed.data.streakReminderTime !== undefined || parsed.data.timezone !== undefined || parsed.data.timezoneOffsetMinutes !== undefined) {
        await reschedulePendingStreakNudges(
            userId,
            settings.streakReminderTime,
            settings.timezone,
            settings.timezoneOffsetMinutes,
        );
    }
    res.status(200).json({ message: "Notification settings updated", settings });
});

// GET /habits/briefing — Morning briefing
export const getMorningBriefing = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ErrorHandler(401, "Unauthorized");
    }

    const briefing = await generateMorningBriefing(userId);
    const slipDetection = await detectSlipPatterns(userId);

    res.status(200).json({
        message: "Morning briefing generated",
        briefing,
        slipDetection,
    });
});

// POST /habits/nudges/dispatch — Internal job endpoint
export const dispatchNudges = TryCatch(async (req: Request, res: Response): Promise<void> => {
    const limit = Number.parseInt(String(req.body?.limit ?? "50"), 10);
    const finalLimit = Number.isNaN(limit) ? 50 : limit;
    if (process.env.QUEUE_ENABLED === "true") {
        const queued = await enqueueDueNudgeDispatchJobs(finalLimit);
        if (queued.deduped > 0) incrementMetric("deduplicated_count", queued.deduped);
        logMetricEvent("nudge_dispatch_enqueued", queued);
        res.status(200).json({
            message: "Nudge dispatch jobs queued",
            ...queued,
        });
        return;
    }

    const result = await dispatchWhatsAppNudges({ limit: finalLimit });
    res.status(200).json({
        message: "Nudge dispatch completed (direct mode)",
        ...result,
    });
});
