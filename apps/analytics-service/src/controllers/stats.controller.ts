import type { Request, Response } from "express";
import { prisma, Status } from "@repo/db";
import { deleteAnalyticsCache, getAnalyticsCache, setAnalyticsCache } from "@repo/cache";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { requestJson } from "../services/internal-http.service.js";
import { predictTaskDuration, getCycleTimePercentiles, predictGrade } from "../services/prediction.service.js";
import { generateSWOT, getSubjectPerformance } from "../services/swot.service.js";
import { calculateCGPA, whatIfGPA, addCourseGrade, updateCourseGrade, deleteCourseGrade } from "../services/gpa.service.js";
import { getPlannedVsActual, detectPeakProductivity, getPredictivePerformance, computeFocusScore } from "../services/focus.service.js";
import { queueExportJob, getExportJobStatus } from "../services/export.service.js";
import { getDailyStatsRange, getTodayStats } from "../services/daily-stats-aggregator.service.js";

const startOfDay = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const HABIT_SERVICE_URL = process.env.HABIT_SERVICE_URL || "http://localhost:4002";
const HABIT_INTERNAL_SECRET = process.env.HABIT_INTERNAL_SECRET || process.env.ANALYTICS_INTERNAL_SECRET || "";

const formatDateKey = (date: Date): string => {
    return date.toISOString().split("T")[0]!;
};

const buildConsecutiveStreak = (distinctDates: string[]): number => {
    if (distinctDates.length === 0) return 0;

    const today = formatDateKey(new Date());
    const yesterday = formatDateKey(new Date(Date.now() - 86400000));
    if (distinctDates[0] !== today && distinctDates[0] !== yesterday) return 0;

    let streak = 0;
    const checkDate = new Date(distinctDates[0]!);
    for (const dateStr of distinctDates) {
        if (dateStr === formatDateKey(checkDate)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
};

const getHabitActiveDates = async (userId: string): Promise<string[]> => {
    if (process.env.NODE_ENV === "test") return [];

    const headers: Record<string, string> = {};
    if (HABIT_INTERNAL_SECRET) {
        headers["x-internal-secret"] = HABIT_INTERNAL_SECRET;
    }

    const result = await requestJson<{ activeDates?: unknown }>({
        url: `${HABIT_SERVICE_URL}/api/habits/internal/active-dates?userId=${encodeURIComponent(userId)}`,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        logContext: {
            service: "analytics-service",
            subsystem: "stats",
            dependency: "habit-service",
            operation: "fetch_active_dates",
        },
    });

    if (!result.ok || !result.data || !Array.isArray(result.data.activeDates)) return [];

    return result.data.activeDates
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
};

const getMergedActiveDates = async (userId: string): Promise<string[]> => {
    // Cache merged active dates for 5 minutes — involves an inter-service HTTP
    // call to the habit service, so caching is critical for BFF latency.
    const cached = await getAnalyticsCache<string[]>(userId, "merged-dates", "all");
    if (cached) return cached;

    const [activityLogs, completionStats, habitActiveDates] = await Promise.all([
        prisma.activityLog.findMany({
            where: { task: { userId } },
            select: { startTime: true },
            orderBy: { startTime: "desc" },
        }),
        prisma.taskCompletionStat.findMany({
            where: { userId },
            select: { completedAt: true },
            orderBy: { completedAt: "desc" },
        }),
        getHabitActiveDates(userId),
    ]);

    const mergedSet = new Set<string>([
        ...activityLogs.map((log) => formatDateKey(log.startTime)),
        ...completionStats.map((stat) => formatDateKey(stat.completedAt)),
        ...habitActiveDates,
    ]);

    const result = Array.from(mergedSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    await setAnalyticsCache(userId, "merged-dates", result, "all", 300);
    return result;
};

const inferScreenActive = (brightness: number | null, motionState: string | null): boolean => {
    if (brightness !== null && brightness <= 0.1) return false;
    if (motionState === "IN_TRANSIT") return false;
    return true;
};

// Internal-only consistency snapshot for cross-service silent-watch checks.
// GET /stats/internal/consistency?userId=...
export const getInternalConsistency = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const secret = req.headers["x-internal-secret"];
        const expected = process.env.ANALYTICS_INTERNAL_SECRET;

        if (!expected || secret !== expected) {
            res.status(401).json({ message: "Unauthorized internal request" });
            return;
        }

        const userId = typeof req.query.userId === "string" ? req.query.userId : "";
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
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
            select: { startTime: true },
        });

        const activeDays = new Set(logs.map((log) => formatDateKey(startOfDay(log.startTime)))).size;
        const consistencyScore = Math.round((activeDays / 7) * 100);

        res.status(200).json({
            message: "Internal consistency snapshot",
            userId,
            activeDays,
            windowDays: 7,
            consistencyScore,
        });
    } catch (error) {
        console.error("Error fetching internal consistency:", error);
        res.status(500).json({
            message: "Failed to fetch internal consistency",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Notification Intelligence - GET /stats/notifications/intelligence
export const getNotificationIntelligence = async (
    req: AuthenticatedRequest,
    res: Response,
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Cache for 1 hour — notification timing preferences shift slowly;
        // a 1-hour TTL eliminates the full session scan on repeat nudge evaluations.
        const notifCached = await getAnalyticsCache<object>(userId, "notification-intel", "v1");
        if (notifCached) {
            res.status(200).json(notifCached);
            return;
        }

        const now = new Date();
        const lookback = new Date(now);
        lookback.setDate(now.getDate() - 21);

        const sessions = await prisma.activityLog.findMany({
            where: {
                task: { userId },
                startTime: { gte: lookback, lte: now },
            },
            select: { startTime: true, durationMinutes: true, sessionType: true },
        });

        const hourBuckets = new Array(24).fill(0) as number[];
        for (const session of sessions) {
            const hour = session.startTime.getHours();
            hourBuckets[hour] = (hourBuckets[hour] ?? 0) + (session.durationMinutes ?? 0);
        }

        let bestHour = 8;
        let bestValue = -1;
        for (let i = 0; i < hourBuckets.length; i++) {
            if ((hourBuckets[i] ?? 0) > bestValue) {
                bestValue = hourBuckets[i] ?? 0;
                bestHour = i;
            }
        }

        const weekdayActivity = new Array(7).fill(0) as number[];
        for (const session of sessions) {
            weekdayActivity[session.startTime.getDay()] = (weekdayActivity[session.startTime.getDay()] ?? 0) + 1;
        }

        const topDay = weekdayActivity
            .map((value, index) => ({ value, index }))
            .sort((a, b) => b.value - a.value)[0]?.index ?? now.getDay();

        const expectedOpenRateLiftPct = sessions.length >= 7 ? 50 : 18;

        const intelligenceResult = {
            message: "Notification intelligence computed",
            intelligence: {
                bestSendHourLocal: bestHour,
                bestSendWindow: `${String(bestHour).padStart(2, "0")}:00-${String((bestHour + 1) % 24).padStart(2, "0")}:00`,
                topActiveWeekday: topDay,
                expectedOpenRateLiftPct,
                confidence: sessions.length >= 14 ? "high" : sessions.length >= 7 ? "medium" : "low",
                sampleSize: sessions.length,
            },
        };

        await setAnalyticsCache(userId, "notification-intel", intelligenceResult, "v1", 3600);
        res.status(200).json(intelligenceResult);
    } catch (error) {
        console.error("Error computing notification intelligence:", error);
        res.status(500).json({ message: "Failed to compute notification intelligence" });
    }
};

// Active Context Signals - GET /stats/notifications/context
export const getActiveContextSignals = async (
    req: AuthenticatedRequest,
    res: Response,
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const brightnessRaw = req.query.brightness;
        const motionRaw = req.query.motionState;
        const locationRaw = req.query.locationTag;

        const brightness = typeof brightnessRaw === "string" ? Number.parseFloat(brightnessRaw) : null;
        const motionState = typeof motionRaw === "string" ? motionRaw : null;
        const locationTag = typeof locationRaw === "string" ? locationRaw : null;

        const screenActive = inferScreenActive(Number.isNaN(brightness as number) ? null : brightness, motionState);
        const suppressNonUrgent = !screenActive || motionState === "IN_TRANSIT";

        const geoRecommendation =
            locationTag === "LIBRARY"
                ? "Start a deep-work block now while you are in the library."
                : locationTag === "CAMPUS"
                    ? "Review your top-3 priorities before your next class."
                    : null;

        res.status(200).json({
            message: "Notification context evaluated",
            context: {
                userId,
                screenActive,
                suppressNonUrgent,
                motionState: motionState ?? "UNKNOWN",
                brightness: brightness ?? null,
                locationTag,
                geoRecommendation,
            },
        });
    } catch (error) {
        console.error("Error computing context signals:", error);
        res.status(500).json({ message: "Failed to compute context signals" });
    }
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

        const { days = "1" } = req.query;
        const daysNum = parseInt(days as string) || 1;

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const start = startOfDay(new Date());
        start.setDate(start.getDate() - (daysNum - 1));

        const summary = await prisma.activityLog.aggregate({
            _sum: { durationMinutes: true },
            where: {
                task: { userId },
                startTime: { gte: start, lte: end },
            },
        });

        const breakdown = await prisma.activityLog.groupBy({
            by: ['sessionType'],
            _sum: { durationMinutes: true },
            where: {
                task: { userId },
                startTime: { gte: start, lte: end },
            },
        });

        const totalMinutes = summary._sum.durationMinutes ?? 0;
        const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
        const totalTasksCompleted = await prisma.taskCompletionStat.count({
            where: {
                userId,
                completedAt: { gte: start, lte: end },
            },
        });

        res.status(200).json({
            message: "Summary fetched successfully",
            stats: {
                totalMinutes,
                totalHours,
                totalTasksCompleted,
                dailyGoalHours: dailyGoalHours * daysNum,
                remainingHours: Math.max(0, (dailyGoalHours * daysNum) - totalHours),
                breakdown: breakdown.map(item => ({
                    type: item.sessionType,
                    minutes: item._sum.durationMinutes || 0,
                    percentage: totalMinutes > 0 ? Math.round(((item._sum.durationMinutes || 0) / totalMinutes) * 100) : 0
                }))
            },
        });
    } catch (error) {
        console.error("Error fetching summary:", error);
        res.status(500).json({
            message: "Failed to fetch summary",
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

        const { taskId } = req.query;
        const today = startOfDay(new Date());
        const start = new Date(today);
        start.setDate(today.getDate() - 6);

        const logs = await prisma.activityLog.findMany({
            where: {
                task: {
                    userId,
                    ...(taskId ? { id: taskId as string } : {}),
                },
                startTime: { gte: start },
            },
            select: { startTime: true, durationMinutes: true },
        });

        const taskStats = await prisma.taskCompletionStat.findMany({
            where: {
                userId,
                completedAt: { gte: start },
            },
            select: { completedAt: true },
        });

        const taskCounts = new Map<string, number>();
        const totals = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const key = formatDateKey(day);
            totals.set(key, 0);
            taskCounts.set(key, 0);
        }

        for (const log of logs) {
            const key = formatDateKey(startOfDay(log.startTime));
            const current = totals.get(key) ?? 0;
            totals.set(key, current + (log.durationMinutes ?? 0));
        }

        for (const stat of taskStats) {
            const key = formatDateKey(startOfDay(stat.completedAt));
            const current = taskCounts.get(key) ?? 0;
            taskCounts.set(key, current + 1);
        }

        const data = Array.from(totals.entries()).map(([date, minutes]) => ({
            date,
            day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            minutes,
            hours: Math.round((minutes / 60) * 10) / 10,
            tasks: taskCounts.get(date) ?? 0,
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

        // Replace N+1 (findMany + include activityLogs) with two aggregate queries.
        const [similarCount, logsAgg] = await Promise.all([
            prisma.task.count({
                where: { userId, title: task.title, status: "COMPLETED" },
            }),
            prisma.activityLog.aggregate({
                where: {
                    task: { userId, title: task.title, status: "COMPLETED" },
                },
                _sum: { durationMinutes: true },
            }),
        ]);

        const averageMinutes =
            similarCount > 0 && (logsAgg._sum.durationMinutes ?? 0) > 0
                ? Math.round((logsAgg._sum.durationMinutes ?? 0) / similarCount)
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
        const dailyGoalHours = req.user?.dailyGoalHours ?? 4;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Delegates to computeFocusScore (focus.service.ts) which owns the
        // 60-second Redis cache.  Both this endpoint and the BFF share the
        // same cache key so at most one DB round-trip happens per minute.
        const focusResult = await computeFocusScore(userId, dailyGoalHours);

        res.status(200).json({
            message: focusResult.totalSessions === 0
                ? "No data found for focus score"
                : "Focus score calculated successfully",
            stats: focusResult,
        });
    } catch (error) {
        console.error("Error calculating focus score:", error);
        res.status(500).json({
            message: "Failed to calculate focus score",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// User Streak - GET /stats/streak
export const getUserStreak = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const distinctDates = await getMergedActiveDates(userId);

        if (distinctDates.length === 0) {
            res.status(200).json({ streak: 0, activeDates: [] });
            return;
        }
        const streak = buildConsecutiveStreak(distinctDates);

        res.status(200).json({
            streak,
            activeDates: distinctDates.slice(0, 14)
        });
    } catch (error) {
        console.error("Error calculating user streak:", error);
        res.status(500).json({
            message: "Failed to calculate streak",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Achievements - GET /stats/achievements
export const getAchievements = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Cache check — achievements change rarely; 5-min TTL is safe.
        // Cache is bypassed (and invalidated) only when new unlocks are detected.
        const achievementCacheKey = "list";
        const cachedAchievements = await getAnalyticsCache<object>(userId, "achievements", achievementCacheKey);
        if (cachedAchievements) {
            res.status(200).json(cachedAchievements);
            return;
        }

        // 1. Fetch user data for calculation
        const sessions = await prisma.activityLog.findMany({
            where: { task: { userId } },
            select: { durationMinutes: true, startTime: true }
        });

        const distinctDates = await getMergedActiveDates(userId);
        const streak = buildConsecutiveStreak(distinctDates);

        const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
        const maxSessionTime = sessions.reduce((max, s) => Math.max(max, s.durationMinutes ?? 0), 0);
        const totalSessions = sessions.length;

        // 2. Fetch all achievement definitions
        const definitions = await prisma.achievement.findMany();

        // 3. Fetch already unlocked achievements
        const unlocked = await prisma.userAchievement.findMany({
            where: { userId },
            select: { achievementId: true, unlockedAt: true }
        });
        const unlockedIds = new Set(unlocked.map((u: { achievementId: string }) => u.achievementId));

        // 4. Check for new unlocks
        const results = definitions.map((def: any) => {
            const isUnlocked = unlockedIds.has(def.id);
            let progress = 0;
            let currentUnlocked = isUnlocked;

            switch (def.type) {
                case 'FOCUS': progress = (totalSessions / def.goalValue) * 100; break;
                case 'STREAK': progress = (streak / def.goalValue) * 100; break;
                case 'TIME': progress = (totalMinutes / def.goalValue) * 100; break;
                case 'SESSION': progress = (maxSessionTime / def.goalValue) * 100; break;
            }

            progress = Math.min(100, Math.round(progress));

            if (!isUnlocked && progress >= 100) {
                // This could be moved to a separate "check" step or done here
                // For now, we'll return it as "just unlocked" logic
                currentUnlocked = true;
            }

            const unlockedInfo = unlocked.find((u: { achievementId: string; unlockedAt: Date }) => u.achievementId === def.id);

            return {
                ...def,
                unlocked: currentUnlocked,
                progress,
                unlockedAt: unlockedInfo?.unlockedAt
            };
        });

        // Sync with DB for newly unlocked ones
        const newlyUnlocked = results.filter((r: any) => r.unlocked && !unlockedIds.has(r.id));
        if (newlyUnlocked.length > 0) {
            await prisma.userAchievement.createMany({
                data: newlyUnlocked.map((a: any) => ({
                    userId,
                    achievementId: a.id
                }))
            });
        }

        const achievementResponse = {
            message: "Achievements retrieved successfully",
            achievements: results
        };

        // Only cache when no new unlocks occurred — if there were new unlocks the
        // next request should re-evaluate (next hit in 5min will be fresh).
        if (newlyUnlocked.length === 0) {
            await setAnalyticsCache(userId, "achievements", achievementResponse, achievementCacheKey, 300);
        } else {
            // Invalidate stale cache so the next request re-evaluates
            await deleteAnalyticsCache(userId, "achievements", achievementCacheKey);
        }

        res.status(200).json(achievementResponse);
    } catch (error) {
        console.error("Error fetching achievements:", error);
        res.status(500).json({
            message: "Failed to fetch achievements",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// Event Handler - POST /events/task-completed
// Handles TASK_COMPLETED, TASK_UPDATED, and TASK_DELETED events
export const handleTaskCompletedEvent = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { type, taskId, userId: _userId, changedFields } = req.body ?? {};

        if (!taskId || typeof taskId !== "string") {
            res.status(400).json({ message: "Invalid event payload: taskId is required" });
            return;
        }

        // ── TASK_COMPLETED ──────────────────────────────────────────────────
        if (type === "TASK_COMPLETED") {
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
            return;
        }

        // ── TASK_UPDATED ────────────────────────────────────────────────────
        if (type === "TASK_UPDATED") {
            // If the task was previously completed, re-compute its stat
            const existingStat = await prisma.taskCompletionStat.findUnique({
                where: { taskId },
            });

            if (existingStat) {
                const task = await prisma.task.findUnique({
                    where: { id: taskId },
                    include: { activityLogs: true },
                });

                if (task) {
                    const totalMinutes = task.activityLogs.reduce(
                        (sum, log) => sum + (log.durationMinutes ?? 0),
                        0,
                    );

                    await prisma.taskCompletionStat.update({
                        where: { taskId },
                        data: { totalMinutes },
                    });
                }
            }

            res.status(200).json({
                message: "Task update processed",
                taskId,
                changedFields: changedFields || {},
            });
            return;
        }

        // ── TASK_DELETED ────────────────────────────────────────────────────
        if (type === "TASK_DELETED") {
            await prisma.taskCompletionStat.deleteMany({
                where: { taskId },
            });

            res.status(200).json({
                message: "Task deletion processed — stats cleaned up",
                taskId,
            });
            return;
        }

        // ── TASK_STATUS_CHANGED ─────────────────────────────────────────────
        if (type === "TASK_STATUS_CHANGED") {
            const previousStatus = req.body.previousStatus as string | undefined ?? (req.body.payload?.previousStatus as string | undefined);
            const newStatus = req.body.newStatus as string | undefined ?? (req.body.payload?.newStatus as string | undefined) ?? (req.body.changedFields?.status as string | undefined);

            // If status changed away from COMPLETED, remove the completion stat
            if (previousStatus === "COMPLETED" && newStatus !== "COMPLETED") {
                await prisma.taskCompletionStat.deleteMany({ where: { taskId } });
                res.status(200).json({ message: "Status change processed (removed completion stat)", taskId });
                return;
            }

            // If status changed to COMPLETED, record completion stat
            if (newStatus === "COMPLETED" && previousStatus !== "COMPLETED") {
                const task = await prisma.task.findUnique({ where: { id: taskId }, include: { activityLogs: true } });
                if (task) {
                    const totalMinutes = task.activityLogs.reduce((sum, log) => sum + (log.durationMinutes ?? 0), 0);
                    await prisma.taskCompletionStat.upsert({
                        where: { taskId: task.id },
                        create: { taskId: task.id, userId: task.userId, totalMinutes, completedAt: new Date() },
                        update: { totalMinutes, completedAt: new Date() },
                    });
                }

                res.status(200).json({ message: "Status change processed (recorded completion)", taskId });
                return;
            }

            // No-op for other transitions
            res.status(200).json({ message: "Status change processed (no-op)", taskId });
            return;
        }

        // Unknown event type
        res.status(400).json({ message: `Unknown event type: ${type}` });
    } catch (error) {
        console.error("Error processing task event:", error);
        res.status(500).json({
            message: "Failed to process task event",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — Duration Prediction (PERT)
// ═══════════════════════════════════════════════════════════════════════

// GET /stats/predict
export const getPrediction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { categoryId, subject, taskId } = req.query;
        const prediction = await predictTaskDuration(userId, {
            ...(categoryId ? { categoryId: categoryId as string } : {}),
            ...(subject ? { subjectId: subject as string } : {}),
            ...(taskId ? { taskId: taskId as string } : {}),
        });

        res.status(200).json({ message: "Prediction generated", prediction });
    } catch (error) {
        console.error("Error generating prediction:", error);
        res.status(500).json({ message: "Failed to generate prediction", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// Phase 3 — Grade Prediction (POST /stats/grade/predict)
export const predictGradeEndpoint = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { subjectId, hoursPerWeek } = req.body;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!subjectId || !hoursPerWeek) {
            res.status(400).json({ message: "subjectId and hoursPerWeek are required" });
            return;
        }

        const prediction = await predictGrade(userId, subjectId as string, Number(hoursPerWeek));
        res.status(200).json({ message: "Grade prediction generated", data: prediction });
    } catch (error) {
        console.error("Error predicting grade:", error);
        res.status(500).json({ message: "Failed to predict grade", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/cycle-time
export const getCycleTime = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { categoryId, subject } = req.query;
        const data = await getCycleTimePercentiles(userId, {
            ...(categoryId ? { categoryId: categoryId as string } : {}),
            ...(subject ? { subjectId: subject as string } : {}),
        });

        res.status(200).json({ message: "Cycle time percentiles", data });
    } catch (error) {
        console.error("Error fetching cycle time:", error);
        res.status(500).json({ message: "Failed to fetch cycle time", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — SWOT Analysis
// ═══════════════════════════════════════════════════════════════════════

// GET /stats/swot/:examType
export const getSWOTAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { examType } = req.params;
        if (!examType) { res.status(400).json({ message: "examType is required" }); return; }

        const raw = await generateSWOT(userId, examType as string);

        // Normalize service response to UI/store contract shape.
        const swot = {
            examType: raw.examType,
            overallReadiness: raw.overallReadiness,
            topPriorityChapters: raw.topPriorityChapters.map((chapter) => chapter.chapter),
            subjects: raw.subjects.map((subject) => ({
                subject: subject.subject,
                strengths: subject.strengths.map((item) => ({
                    chapter: item.chapter,
                    score: item.successRate,
                })),
                weaknesses: subject.weaknesses.map((item) => ({
                    chapter: item.chapter,
                    score: item.successRate,
                })),
                opportunities: subject.opportunities.map((item) => ({
                    chapter: item.chapter,
                    score: item.successRate,
                    reason: item.avgTimePerQuestion > 0
                        ? `Avg time/question: ${item.avgTimePerQuestion} mins`
                        : "Moderate score with room for improvement",
                })),
                threats: subject.threats.map((item) => ({
                    chapter: item.chapter,
                    score: item.successRate,
                    reason: item.avgTimePerQuestion > 0
                        ? `Low score and avg time/question: ${item.avgTimePerQuestion} mins`
                        : "Low score needs immediate attention",
                })),
            })),
        };

        res.status(200).json({ message: "SWOT analysis generated", swot });
    } catch (error) {
        console.error("Error generating SWOT:", error);
        res.status(500).json({ message: "Failed to generate SWOT", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/subjects — returns performance stats for ALL subjects belonging to
// the authenticated user. Results are aggregated in a single DB round-trip via
// groupBy and cached per-user for 5 minutes.
export const getAllSubjectStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const cacheKey = "all";
        const cached = await getAnalyticsCache<object[]>(userId, "all-subjects", cacheKey);
        if (cached) {
            res.status(200).json({ message: "All subject performance fetched", data: cached });
            return;
        }

        // Two parallel DB calls:
        // 1. groupBy for avg + count — one row per subject.
        // 2. Window-function query for trend — returns only the first 5 and last
        //    5 entries PER subject regardless of total history size.
        //    This replaces the previous findMany(take:200) + JS groupBy that
        //    transferred up to 200 rows and iterated over them in Node.js.
        type TrendRow = { subjectName: string; obtainedMarks: number; totalMarks: number };

        const [agg, trendRows] = await Promise.all([
            prisma.gradeEntry.groupBy({
                by: ["subjectName"],
                where: { userId },
                _avg: { obtainedMarks: true, totalMarks: true },
                _count: { id: true },
            }),
            prisma.$queryRaw<TrendRow[]>`
                SELECT "subjectName",
                       "obtainedMarks"::float AS "obtainedMarks",
                       "totalMarks"::float    AS "totalMarks"
                FROM (
                    SELECT "subjectName", "obtainedMarks", "totalMarks",
                           ROW_NUMBER() OVER (PARTITION BY "subjectName" ORDER BY "createdAt" ASC)  AS rn_asc,
                           ROW_NUMBER() OVER (PARTITION BY "subjectName" ORDER BY "createdAt" DESC) AS rn_desc
                    FROM   "GradeEntry"
                    WHERE  "userId" = ${userId}
                ) ranked
                WHERE rn_asc <= 5 OR rn_desc <= 5
            `,
        ]);

        if (agg.length === 0) {
            res.status(200).json({ message: "All subject performance fetched", data: [] });
            return;
        }

        // Build per-subject trend map from the already-filtered rows.
        const firstRows = new Map<string, TrendRow[]>();
        for (const row of trendRows) {
            const bucket = firstRows.get(row.subjectName) ?? [];
            bucket.push(row);
            firstRows.set(row.subjectName, bucket);
        }
        // Split into early / recent halves per subject.
        const splitTrend = (rows: TrendRow[]) => {
            const mid = Math.ceil(rows.length / 2);
            return { first: rows.slice(0, mid), last: rows.slice(-mid) };
        };

        const data = agg.map((row) => {
            const avgScore = row._avg.totalMarks && row._avg.totalMarks > 0
                ? Math.round(((row._avg.obtainedMarks ?? 0) / row._avg.totalMarks) * 100)
                : 0;

            const rows = firstRows.get(row.subjectName) ?? [];
            const { first, last } = splitTrend(rows);
            const earlyRate = first.length > 0 ? first.reduce((s, e) => s + e.obtainedMarks / e.totalMarks, 0) / first.length : 0;
            const recentRate = last.length > 0 ? last.reduce((s, e) => s + e.obtainedMarks / e.totalMarks, 0) / last.length : 0;
            const improvementRate = Math.round((recentRate - earlyRate) * 100);
            const trend = improvementRate > 5 ? "improving" : improvementRate < -5 ? "declining" : "stable";

            return {
                subjectName: row.subjectName,
                avgScore,
                entryCount: row._count.id,
                trend,
                improvementRate,
            };
        });

        await setAnalyticsCache(userId, "all-subjects", data, cacheKey, 300);
        res.status(200).json({ message: "All subject performance fetched", data });
    } catch (error) {
        console.error("Error fetching all subject stats:", error);
        res.status(500).json({ message: "Failed to fetch all subject stats", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/subject/:name
export const getSubjectStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { name } = req.params;
        if (!name) { res.status(400).json({ message: "Subject name is required" }); return; }

        const data = await getSubjectPerformance(userId, decodeURIComponent(name as string));
        res.status(200).json({ message: "Subject performance fetched", data });
    } catch (error) {
        console.error("Error fetching subject stats:", error);
        res.status(500).json({ message: "Failed to fetch subject stats", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — GPA Calculator
// ═══════════════════════════════════════════════════════════════════════

// GET /stats/gpa
export const getGPA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const scale = (req.query.scale as string) || "INDIA_10";
        const raw = await calculateCGPA(userId, scale as "INDIA_10" | "US_4" | "PERCENTAGE");
        const normalizedRaw = raw as typeof raw & {
            cgpa?: number;
            semesterBreakdown?: Array<{ semester: number; gpa: number; credits?: number; totalCredits?: number }>;
            courses?: Array<{ courseName: string; credits: number; gradePoint: number; grade?: string | null; semester?: number }>;
        };

        const semesterBreakdown = normalizedRaw.semesters
            ? normalizedRaw.semesters.map((sem) => ({
                semester: sem.semester,
                gpa: sem.gpa,
                credits: sem.totalCredits,
            }))
            : (normalizedRaw.semesterBreakdown ?? []).map((sem) => ({
                semester: sem.semester,
                gpa: sem.gpa,
                credits: sem.credits ?? sem.totalCredits ?? 0,
            }));

        const courses = (normalizedRaw.semesters ?? []).flatMap((sem) =>
            sem.courses.map((course) => ({
                id: course.id,
                courseName: course.courseName,
                credits: course.credits,
                gradePoint: course.gradePoint,
                grade: course.grade ?? undefined,
                semester: sem.semester,
            }))
        );

        // Normalize service response to UI/store contract shape.
        const result = {
            cgpa: normalizedRaw.currentCGPA ?? normalizedRaw.cgpa ?? 0,
            totalCredits: normalizedRaw.totalCredits ?? 0,
            semesterBreakdown,
            courses,
        };

        res.status(200).json({ message: "CGPA calculated", result });
    } catch (error) {
        console.error("Error calculating GPA:", error);
        res.status(500).json({ message: "Failed to calculate GPA", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// POST /stats/gpa/what-if
export const getWhatIfGPA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { targetCGPA, remainingCredits, scale } = req.body ?? {};
        if (!targetCGPA || !remainingCredits) {
            res.status(400).json({ message: "targetCGPA and remainingCredits are required" });
            return;
        }

        const result = await whatIfGPA(userId, parseFloat(targetCGPA), parseInt(remainingCredits), scale || "INDIA_10");
        res.status(200).json({ message: "What-if result", result });
    } catch (error) {
        console.error("Error in what-if GPA:", error);
        res.status(500).json({ message: "Failed to calculate what-if GPA", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// POST /stats/gpa/course
export const addCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { courseName, credits, gradePoint, grade, semester } = req.body ?? {};
        if (!courseName || credits == null || gradePoint == null) {
            res.status(400).json({ message: "courseName, credits, and gradePoint are required" });
            return;
        }

        const course = await addCourseGrade(userId, {
            courseName,
            credits: parseFloat(credits),
            gradePoint: parseFloat(gradePoint),
            grade,
            ...(semester ? { semester: parseInt(semester) } : {}),
        });
        res.status(201).json({ message: "Course added", course });
    } catch (error) {
        console.error("Error adding course:", error);
        res.status(500).json({ message: "Failed to add course", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// PUT /stats/gpa/course/:id
export const updateCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { id } = req.params;
        const course = await updateCourseGrade((id as string)!, userId, req.body);
        res.status(200).json({ message: "Course updated", course });
    } catch (error) {
        console.error("Error updating course:", error);
        res.status(500).json({ message: "Failed to update course", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// DELETE /stats/gpa/course/:id
export const deleteCourse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { id } = req.params;
        await deleteCourseGrade((id as string)!, userId);
        res.status(200).json({ message: "Course deleted" });
    } catch (error) {
        console.error("Error deleting course:", error);
        res.status(500).json({ message: "Failed to delete course", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — Grade Entries (for SWOT / Predictive)
// ═══════════════════════════════════════════════════════════════════════

// POST /stats/grade-entry
export const addGradeEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { subjectName, chapter, totalMarks, obtainedMarks, examType, timeTakenMins } = req.body ?? {};
        if (!subjectName || totalMarks == null || obtainedMarks == null) {
            res.status(400).json({ message: "subjectName, totalMarks, and obtainedMarks are required" });
            return;
        }

        const entry = await prisma.gradeEntry.create({
            data: {
                userId, subjectName, chapter, totalMarks: parseFloat(totalMarks), obtainedMarks: parseFloat(obtainedMarks),
                examType: examType || "JEE", timeTakenMins: timeTakenMins ? parseInt(timeTakenMins) : null,
            },
        });

        // Invalidate SWOT, predictive, subject and all-subjects caches
        const et = (examType || "JEE") as string;
        await Promise.all([
            deleteAnalyticsCache(userId, "swot", et),
            deleteAnalyticsCache(userId, "predictive", et),
            deleteAnalyticsCache(userId, "subject", (subjectName as string).trim().toLowerCase()),
            deleteAnalyticsCache(userId, "all-subjects", "all"),
        ]);

        res.status(201).json({ message: "Grade entry added", entry });
    } catch (error) {
        console.error("Error adding grade entry:", error);
        res.status(500).json({ message: "Failed to add grade entry", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/grade-entries
export const getGradeEntries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { examType, subject } = req.query;
        const entries = await prisma.gradeEntry.findMany({
            where: {
                userId,
                ...(examType ? { examType: examType as string } : {}),
                ...(subject ? { subjectName: subject as string } : {}),
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({ message: "Grade entries fetched", entries });
    } catch (error) {
        console.error("Error fetching grade entries:", error);
        res.status(500).json({ message: "Failed to fetch grade entries", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// DELETE /stats/grade-entry/:id
export const deleteGradeEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { id } = req.params;

        // Fetch the entry before deleting so we can invalidate the right caches
        const existing = await prisma.gradeEntry.findFirst({ where: { id: (id as string)!, userId }, select: { examType: true, subjectName: true } });

        await prisma.gradeEntry.deleteMany({ where: { id: (id as string)!, userId } });

        if (existing) {
            await Promise.all([
                deleteAnalyticsCache(userId, "swot", existing.examType),
                deleteAnalyticsCache(userId, "predictive", existing.examType),
                deleteAnalyticsCache(userId, "subject", existing.subjectName.trim().toLowerCase()),
                deleteAnalyticsCache(userId, "all-subjects", "all"),
            ]);
        }

        res.status(200).json({ message: "Grade entry deleted" });
    } catch (error) {
        console.error("Error deleting grade entry:", error);
        res.status(500).json({ message: "Failed to delete grade entry", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// PUT /stats/grade-entry/:id
export const updateGradeEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { id } = req.params;
        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Entry id is required" });
            return;
        }

        // Snapshot old values BEFORE the update so we can selectively bust caches
        // for both the old examType/subject AND the new ones (they may differ).
        const before = await prisma.gradeEntry.findFirst({
            where: { id, userId },
            select: { examType: true, subjectName: true },
        });

        if (!before) {
            res.status(404).json({ message: "Grade entry not found" });
            return;
        }

        const { subjectName, chapter, totalMarks, obtainedMarks, examType, timeTakenMins } = req.body ?? {};

        const updated = await prisma.gradeEntry.update({
            where: { id },
            data: {
                ...(subjectName != null && { subjectName }),
                ...(chapter !== undefined && { chapter }),
                ...(totalMarks != null && { totalMarks: parseFloat(totalMarks) }),
                ...(obtainedMarks != null && { obtainedMarks: parseFloat(obtainedMarks) }),
                ...(examType != null && { examType }),
                ...(timeTakenMins !== undefined && { timeTakenMins: timeTakenMins !== null ? parseInt(timeTakenMins) : null }),
            },
        });

        // Invalidate for OLD keys first, then NEW keys.
        // Using a Set deduplications the calls when fields haven't changed.
        const keysToInvalidate = new Set<string>();
        const addKeys = (et: string, sn: string) => {
            keysToInvalidate.add(`swot:${et}`);
            keysToInvalidate.add(`predictive:${et}`);
            keysToInvalidate.add(`subject:${sn.trim().toLowerCase()}`);
        };
        addKeys(before.examType, before.subjectName);
        addKeys(updated.examType, updated.subjectName);
        // Always bust the all-subjects roll-up cache on any grade entry mutation.
        keysToInvalidate.add("all-subjects:all");

        await Promise.all(
            Array.from(keysToInvalidate).map((key) => {
                const [reportType, param] = key.split(":") as [string, string];
                return deleteAnalyticsCache(userId, reportType, param);
            }),
        );

        res.status(200).json({ message: "Grade entry updated", entry: updated });
    } catch (error) {
        console.error("Error updating grade entry:", error);
        res.status(500).json({ message: "Failed to update grade entry", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — Focus / Time Leakage
// ═══════════════════════════════════════════════════════════════════════

// GET /stats/focus/leakage
export const getTimeLeakage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const days = parseInt(req.query.days as string) || 14;
        const report = await getPlannedVsActual(userId, days);
        res.status(200).json({ message: "Time leakage report", report });
    } catch (error) {
        console.error("Error fetching leakage:", error);
        res.status(500).json({ message: "Failed to fetch leakage report", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/focus/peak-window
export const getPeakWindow = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const days = parseInt(req.query.days as string) || 30;
        const data = await detectPeakProductivity(userId, days);
        res.status(200).json({ message: "Peak productivity window", data });
    } catch (error) {
        console.error("Error detecting peak window:", error);
        res.status(500).json({ message: "Failed to detect peak window", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// GET /stats/performance/:examType
export const getPredictivePerformanceEndpoint = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { examType } = req.params;
        if (!examType) { res.status(400).json({ message: "examType is required" }); return; }

        const runsParam = req.query.runs;
        const seedParam = req.query.seed;
        const parsedRuns = typeof runsParam === "string" ? Number.parseInt(runsParam, 10) : NaN;
        const parsedSeed = typeof seedParam === "string" ? Number.parseInt(seedParam, 10) : NaN;
        const simulationOptions: { runs?: number; seed?: number } = {};

        if (Number.isFinite(parsedRuns) && parsedRuns > 0) {
            simulationOptions.runs = parsedRuns;
        }
        if (Number.isFinite(parsedSeed)) {
            simulationOptions.seed = parsedSeed;
        }

        const data = await getPredictivePerformance(userId, examType as string, simulationOptions);

        res.status(200).json({
            message: "Predictive performance",
            modelVersion: "monte-carlo-v1",
            data,
        });
    } catch (error) {
        console.error("Error fetching predictive performance:", error);
        res.status(500).json({ message: "Failed to fetch predictive performance", error: error instanceof Error ? error.message : "Unknown error" });
    }
};

// Mock Exam Routines for internal generator
const INTERNAL_EXAM_ROUTINES: Record<string, { subject: string; duration: number }[]> = {
    JEE: [
        { subject: 'Physics', duration: 150 },
        { subject: 'Chemistry', duration: 120 },
        { subject: 'Mathematics', duration: 180 },
    ],
    NEET: [
        { subject: 'Physics', duration: 120 },
        { subject: 'Chemistry', duration: 120 },
        { subject: 'Biology (Botany)', duration: 90 },
        { subject: 'Biology (Zoology)', duration: 90 },
    ],
    UPSC: [
        { subject: 'General Studies', duration: 150 },
        { subject: 'CSAT / Aptitude', duration: 90 },
        { subject: 'Optional Subject', duration: 120 },
    ],
};

/**
 * Generates a prioritized revision schedule based on SWOT analysis.
 * GET /stats/revision-schedule?examType=JEE
 */
export const getRevisionSchedule = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const examType = typeof req.query.examType === "string" ? req.query.examType : "JEE";

        // Cache for 10 minutes — schedule depends only on SWOT (which has its
        // own TTL), so re-generating every request is pure wasted CPU + DB.
        const scheduleCacheKey = `schedule:${examType}`;
        const scheduleCached = await getAnalyticsCache<object>(userId, "revision", scheduleCacheKey);
        if (scheduleCached) {
            res.status(200).json(scheduleCached);
            return;
        }

        const swot = await generateSWOT(userId, examType);
        const routine = INTERNAL_EXAM_ROUTINES[examType] || INTERNAL_EXAM_ROUTINES.JEE;

        // Flatten all weaknesses and threats for selection
        const priorityCandidates = swot.subjects.flatMap(s => [...s.weaknesses, ...s.threats]);

        const blockTime = new Date();
        blockTime.setHours(6, 0, 0, 0); // Start at 6 AM

        const schedule = routine!.map((block, idx) => {
            // Try to find a specific chapter for this subject from the priority list
            const matchedChapter = priorityCandidates.find(c =>
                c.subjectName.toLowerCase() === block.subject.toLowerCase()
            );

            // If no weakness found, pick a random "opportunity" or just a general review
            const chapterName = matchedChapter?.chapter ?? "General Review";
            const typeLabels: ("DPP" | "PYQ" | "REVISION")[] = ["DPP", "PYQ", "REVISION"];
            const type = typeLabels[idx % 3]!;

            const startTimeStr = blockTime.toTimeString().slice(0, 5);
            blockTime.setMinutes(blockTime.getMinutes() + block.duration);

            const item = {
                id: `rev-${idx}-${Date.now()}`,
                subject: block.subject,
                chapter: chapterName,
                type: type,
                time: startTimeStr,
                duration: block.duration,
                completed: false
            };

            // Reset blockTime for next subject after a small break
            blockTime.setMinutes(blockTime.getMinutes() + 15);

            return item;
        });

        const scheduleResult = {
            message: `Revision schedule for ${examType} generated`,
            examType,
            schedule,
            overallReadiness: swot.overallReadiness,
        };
        await setAnalyticsCache(userId, "revision", scheduleResult, scheduleCacheKey, 600);
        res.status(200).json(scheduleResult);
    } catch (error) {
        console.error("Error generating revision schedule:", error);
        res.status(500).json({
            message: "Failed to generate revision schedule",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// BFF — Dashboard Summary (batches leakage + peak + focus + streak)
// GET /stats/dashboard-summary
// ═══════════════════════════════════════════════════════════════════════

/**
 * Single endpoint that returns all data needed for the productivity
 * insights dashboard in one round-trip, eliminating the frontend
 * waterfall of 3+ parallel RTK-Query hooks.
 *
 * All constituent computations are independently cached so repeat
 * calls within their TTL are essentially free.
 */
export const getDashboardSummary = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        const dailyGoalHours = req.user?.dailyGoalHours ?? 4;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const leakageDays = parseInt(req.query.leakageDays as string) || 7;
        const peakDays = parseInt(req.query.peakDays as string) || 30;

        // Top-level BFF cache — 2 min TTL covers the full aggregated response.
        // Sub-functions (leakage/peak/predictive) have their own longer TTLs;
        // this outer cache eliminates the Promise.all overhead on repeat hits.
        // v2 adds activeDates[] to the response (for TopStats history dots).
        const bffCacheKey = `bffv2:${leakageDays}:${peakDays}`;
        const bffCached = await getAnalyticsCache<object>(userId, "dashboard", bffCacheKey);
        if (bffCached) {
            res.status(200).json(bffCached);
            return;
        }

        // Fetch everything in parallel — each call hits its own cache first.
        // computeFocusScore shares the same 60 s Redis cache as GET /stats/focus,
        // so when both endpoints are called within 60 s only one DB scan happens.
        const [leakage, peak, distinctDates, focusStats] = await Promise.all([
            getPlannedVsActual(userId, leakageDays),
            detectPeakProductivity(userId, peakDays),
            getMergedActiveDates(userId),
            computeFocusScore(userId, dailyGoalHours),
        ]);

        // ── Streak ──────────────────────────────────────────────────────
        const streak = buildConsecutiveStreak(distinctDates);

        const dashboardResult = {
            message: "Dashboard summary",
            leakage,
            peak,
            focus: focusStats,
            streak,
            // Included here so TopStats can render 14-day history without a
            // separate useGetUserStreakQuery round-trip.
            activeDates: distinctDates.slice(0, 14),
            generatedAt: new Date().toISOString(),
        };

        // Store in cache then respond
        await setAnalyticsCache(userId, "dashboard", dashboardResult, bffCacheKey, 120);
        res.status(200).json(dashboardResult);
    } catch (error) {
        console.error("Error generating dashboard summary:", error);
        res.status(500).json({
            message: "Failed to generate dashboard summary",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// BFF — Strategic Analytics Summary
// GET /stats/strategic-summary
// ═══════════════════════════════════════════════════════════
/**
 * Batches the 5 expensive analytical computations on the strategic page into a
 * single cache-aware round-trip, eliminating 5 independent HTTP requests on
 * mount. Each sub-computation is independently cached so repeat calls within
 * their respective TTLs are free. The outer 5-min TTL means repeated navigation
 * to the strategic page does zero backend computation.
 */
export const getStrategicSummary = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const examType = (req.query.examType as string) || "JEE";
        const strategicCacheKey = `strategic:${examType}`;
        const cached = await getAnalyticsCache<object>(userId, "strategic", strategicCacheKey);
        if (cached) {
            res.status(200).json(cached);
            return;
        }

        // Run all 5 sub-computations in parallel — each has its own cache
        const [peak, leakage, swot, cycleTime, predictive] = await Promise.all([
            detectPeakProductivity(userId, 14),
            getPlannedVsActual(userId, 7),
            generateSWOT(userId, examType),
            getCycleTimePercentiles(userId, {}),
            getPredictivePerformance(userId, examType),
        ]);

        const result = {
            message: "Strategic analytics summary",
            peak,
            leakage,
            swot,
            cycleTime,
            predictive,
            examType,
            generatedAt: new Date().toISOString(),
        };

        await setAnalyticsCache(userId, "strategic", result, strategicCacheKey, 300);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error generating strategic summary:", error);
        res.status(500).json({
            message: "Failed to generate strategic summary",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// SRL — Weekly Review + Plan-vs-Actual
// ═══════════════════════════════════════════════════════════════════════

export const getWeeklyReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const daysRaw = typeof req.query.days === "string" ? Number.parseInt(req.query.days, 10) : NaN;
        const days = Number.isFinite(daysRaw) ? Math.min(30, Math.max(3, daysRaw)) : 7;
        const examType = (req.query.examType as string) || "JEE";

        const today = startOfDay(new Date());
        const from = startOfDay(new Date(today));
        from.setDate(from.getDate() - (days - 1));

        const cacheKey = `weekly:${examType}:${formatDateKey(from)}:${days}`;
        const cached = await getAnalyticsCache<object>(userId, "srl", cacheKey);
        if (cached) {
            res.status(200).json(cached);
            return;
        }

        const [user, completionStats, focusAgg, overdueTasks, upcomingTasks, habitLogs, gradeEntries, swot] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { dailyGoalHours: true, username: true } }),
            prisma.taskCompletionStat.findMany({
                where: { userId, completedAt: { gte: from } },
                select: { totalMinutes: true, completedAt: true, taskId: true },
                orderBy: { completedAt: "desc" },
            }),
            prisma.activityLog.aggregate({
                where: { task: { userId }, startTime: { gte: from } },
                _sum: { durationMinutes: true },
                _count: { id: true },
            }),
            prisma.task.findMany({
                where: {
                    userId,
                    status: { not: Status.COMPLETED },
                    dueDate: { lt: new Date() },
                },
                select: { id: true, title: true, dueDate: true, priority: true },
                orderBy: [{ dueDate: "asc" }],
                take: 10,
            }),
            prisma.task.findMany({
                where: {
                    userId,
                    status: { not: Status.COMPLETED },
                    dueDate: { gte: new Date(), lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
                },
                select: { id: true, title: true, dueDate: true, priority: true },
                orderBy: [{ dueDate: "asc" }],
                take: 10,
            }),
            prisma.habitLog.findMany({
                where: { habit: { userId }, loggedAt: { gte: from } },
                select: { loggedAt: true, habitId: true },
                orderBy: { loggedAt: "desc" },
            }),
            prisma.gradeEntry.findMany({
                where: { userId, createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
                select: { obtainedMarks: true, totalMarks: true, subjectName: true, chapter: true, createdAt: true, examType: true },
                orderBy: { createdAt: "desc" },
                take: 50,
            }),
            generateSWOT(userId, examType),
        ]);

        const completedCount = completionStats.length;
        const completedMinutes = completionStats.reduce((sum, row) => sum + (row.totalMinutes ?? 0), 0);
        const focusMinutes = focusAgg._sum.durationMinutes ?? 0;
        const focusSessions = focusAgg._count.id ?? 0;

        const habitDays = new Set<string>();
        for (const log of habitLogs) {
            habitDays.add(formatDateKey(log.loggedAt));
        }
        const habitActiveDays = habitDays.size;

        const recentScores = gradeEntries
            .filter((e) => e.totalMarks > 0)
            .map((e) => Math.round((e.obtainedMarks / e.totalMarks) * 100));
        const avgScore = recentScores.length > 0 ? Math.round(recentScores.reduce((s, n) => s + n, 0) / recentScores.length) : null;

        const dailyGoalHours = user?.dailyGoalHours ?? 4;
        const weeklyGoalMinutes = Math.round(dailyGoalHours * days * 60);

        const insights = [
            {
                title: "Execution",
                detail: `Completed ${completedCount} task(s) in the last ${days} days.`,
                metrics: { completedCount, completedMinutes },
            },
            {
                title: "Focus",
                detail: `Logged ${focusMinutes} focus minute(s) across ${focusSessions} session(s).`,
                metrics: { focusMinutes, focusSessions, weeklyGoalMinutes },
            },
            {
                title: "Habits",
                detail: `Stayed consistent on ${habitActiveDays}/${days} day(s).`,
                metrics: { habitActiveDays, days },
            },
        ] as const;

        const priorities: Array<{ type: "TASK" | "REVISION"; title: string; dueDate?: string; entityId?: string }> = [];
        for (const task of overdueTasks.slice(0, 3)) {
            priorities.push({
                type: "TASK",
                title: `Overdue: ${task.title}`,
                ...(task.dueDate ? { dueDate: task.dueDate.toISOString() } : {}),
                entityId: task.id,
            });
        }

        if (priorities.length < 3) {
            for (const task of upcomingTasks.slice(0, 3 - priorities.length)) {
                priorities.push({
                    type: "TASK",
                    title: `Upcoming: ${task.title}`,
                    ...(task.dueDate ? { dueDate: task.dueDate.toISOString() } : {}),
                    entityId: task.id,
                });
            }
        }

        if (priorities.length < 3) {
            for (const chapter of (swot.topPriorityChapters || []).slice(0, 3 - priorities.length)) {
                priorities.push({
                    type: "REVISION",
                    title: `Revise: ${chapter.chapter}`,
                });
            }
        }

        const adjustment = (() => {
            if (focusMinutes < weeklyGoalMinutes * 0.6) {
                return `Your focus time is below your goal. Try scheduling 1 extra ${Math.max(20, Math.round((weeklyGoalMinutes - focusMinutes) / 3))}-minute block on 3 days this week.`;
            }
            if (overdueTasks.length > 5) {
                return "Too many overdue items. Consider using Recovery Rebalance to shift dates and reduce stress.";
            }
            if (avgScore !== null && avgScore < 60) {
                return "Recent scores are trending low. Prioritize your weakest chapters and do 1 timed practice set daily.";
            }
            return "Maintain the current pace. Keep your top 3 priorities small and finishable.";
        })();

        const result = {
            message: "Weekly review",
            days,
            examType,
            from: from.toISOString(),
            to: new Date().toISOString(),
            insights,
            priorities,
            adjustment,
            score: avgScore,
            generatedAt: new Date().toISOString(),
        };

        await setAnalyticsCache(userId, "srl", result, cacheKey, 300);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error generating weekly review:", error);
        res.status(500).json({
            message: "Failed to generate weekly review",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

export const getSrlPlanVsActual = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const daysRaw = typeof req.query.days === "string" ? Number.parseInt(req.query.days, 10) : NaN;
        const days = Number.isFinite(daysRaw) ? Math.min(30, Math.max(3, daysRaw)) : 7;

        const report = await getPlannedVsActual(userId, days);
        res.status(200).json({ message: "Plan vs actual", report });
    } catch (error) {
        console.error("Error generating plan vs actual:", error);
        res.status(500).json({
            message: "Failed to generate plan vs actual",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// 50K-Scale: Pre-Aggregated Analytics Overview (O(1) read path)
// GET /stats/overview
// ═══════════════════════════════════════════════════════════════════════

/**
 * Returns per-day analytics for the last N days using the pre-aggregated
 * DailyUserStats table — completely eliminating live multi-query aggregations
 * at peak load.
 *
 * At 750 concurrent requests this endpoint does:
 *   - 1 Redis cache check (sub-ms)
 *   - On miss: 1 indexed DB read by (userId, date range) — at most 30 rows
 *
 * vs. the previous pattern:
 *   - 3 separate DB aggregation queries per request = 2,250 concurrent queries
 */
export const getAnalyticsOverview = async (
    req: AuthenticatedRequest,
    res: Response,
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const daysRaw = typeof req.query.days === "string" ? parseInt(req.query.days, 10) : NaN;
        const days = Number.isFinite(daysRaw) ? Math.min(30, Math.max(1, daysRaw)) : 7;

        // Cache for 2 minutes — pre-aggregated data changes only on write events
        const cacheKey = `overview:${days}`;
        const cached = await getAnalyticsCache<object>(userId, "overview", cacheKey);
        if (cached) {
            res.status(200).json(cached);
            return;
        }

        const now = new Date();
        const from = new Date(now);
        from.setUTCDate(from.getUTCDate() - (days - 1));
        from.setUTCHours(0, 0, 0, 0);

        // O(1) read from pre-aggregated table (at most `days` rows)
        const dailyStats = await getDailyStatsRange(userId, from, now);
        const todayStats = await getTodayStats(userId);

        // Merge today's live stats (in case the write-time hook hasn't fired yet)
        const stats = dailyStats.length > 0 ? dailyStats : [todayStats];

        // Compute rolling totals
        const totalFocusMinutes = stats.reduce((sum, d) => sum + d.focusMinutes, 0);
        const totalCompleted = stats.reduce((sum, d) => sum + d.completedTasks, 0);
        const totalSessions = stats.reduce((sum, d) => sum + d.sessionCount, 0);
        const avgScore = stats.filter(d => d.avgScore !== null).length > 0
            ? Math.round(
                stats.reduce((sum, d) => sum + (d.avgScore ?? 0), 0) /
                stats.filter(d => d.avgScore !== null).length * 10
            ) / 10
            : null;

        const result = {
            message: "Analytics overview (pre-aggregated)",
            days,
            today: {
                focusMinutes: todayStats.focusMinutes,
                completedTasks: todayStats.completedTasks,
                overdueTasks: todayStats.overdueTasks,
                sessionCount: todayStats.sessionCount,
                avgScore: todayStats.avgScore,
            },
            rolling: {
                totalFocusMinutes,
                totalFocusHours: Math.round((totalFocusMinutes / 60) * 10) / 10,
                totalCompletedTasks: totalCompleted,
                totalSessions,
                avgScore,
            },
            daily: stats.map(d => ({
                date: d.date.toISOString().split("T")[0],
                focusMinutes: d.focusMinutes,
                completedTasks: d.completedTasks,
                overdueTasks: d.overdueTasks,
                sessionCount: d.sessionCount,
                deepWorkMinutes: d.deepWorkMinutes,
                avgScore: d.avgScore,
            })),
            generatedAt: new Date().toISOString(),
        };

        await setAnalyticsCache(userId, "overview", result, cacheKey, 120);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching analytics overview:", error);
        res.status(500).json({
            message: "Failed to fetch analytics overview",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════
// 50K-Scale: Async Export (Step 5 — stream exports via background worker)
// POST /stats/export
// GET  /stats/export/:id
// ═══════════════════════════════════════════════════════════════════════

/**
 * Queue an async export job — returns a job ID immediately (< 5ms).
 * The actual file is generated by the BullMQ export worker in the background.
 * Client polls GET /stats/export/:id or receives SSE notification on completion.
 *
 * This prevents the 150 MB memory spikes from 50 concurrent PDF generations
 * on the main server thread.
 */
export const exportReport = async (
    req: AuthenticatedRequest,
    res: Response,
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { type, fromDate, toDate, examType, format } = req.body ?? {};
        const validTypes = ["PDF_REPORT", "CSV_TASKS", "CSV_GRADES"] as const;
        type ExportType = typeof validTypes[number];

        if (!type || !validTypes.includes(type as ExportType)) {
            res.status(400).json({
                message: `type is required. Valid values: ${validTypes.join(", ")}`,
            });
            return;
        }

        const { exportJobId } = await queueExportJob(userId, type as ExportType, {
            ...(fromDate ? { fromDate: String(fromDate) } : {}),
            ...(toDate ? { toDate: String(toDate) } : {}),
            ...(examType ? { examType: String(examType) } : {}),
            ...(format ? { format: String(format) } : {}),
        });

        res.status(202).json({
            message: "Export queued. Poll the status endpoint for progress.",
            exportJobId,
            statusUrl: `/api/stats/export/${exportJobId}`,
        });
    } catch (error) {
        console.error("Error queuing export:", error);
        res.status(500).json({
            message: "Failed to queue export",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * Poll export job status.
 * Returns { status: "PENDING" | "PROCESSING" | "DONE" | "FAILED", fileUrl?, errorMsg? }
 */
export const getExportStatus = async (
    req: AuthenticatedRequest,
    res: Response,
): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        if (!id || typeof id !== "string") {
            res.status(400).json({ message: "Export job ID is required" });
            return;
        }

        const job = await getExportJobStatus(id, userId);
        if (!job) {
            res.status(404).json({ message: "Export job not found" });
            return;
        }

        res.status(200).json({
            message: "Export job status",
            job,
        });
    } catch (error) {
        console.error("Error fetching export status:", error);
        res.status(500).json({
            message: "Failed to fetch export status",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};
