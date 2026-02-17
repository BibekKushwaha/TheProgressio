/**
 * Gentle Streak Engine — supports mercy days, AI recovery, and XP rewards.
 * 
 * "Gentle Streaks" prevent all-or-nothing motivation loss by allowing
 * configurable "mercy days" (skip days) before a streak actually breaks.
 */
import { prisma, type Frequency } from "@repo/db";

// ── Helpers ────────────────────────────────────────────────────────────

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

const getPeriodKey = (frequency: Frequency, date: Date): number => {
    return frequency === "WEEKLY"
        ? startOfWeek(date).getTime()
        : startOfDay(date).getTime();
};

const getPeriodStep = (frequency: Frequency): number => {
    return frequency === "WEEKLY" ? 7 : 1;
};

// ── XP Constants ───────────────────────────────────────────────────────

export const XP_REWARDS = {
    HABIT_LOG: 10,          // Base XP per habit check-in
    STREAK_3: 25,           // Bonus at 3-day streak
    STREAK_7: 75,           // Bonus at 7-day streak
    STREAK_14: 150,         // Bonus at 14-day streak
    STREAK_30: 500,         // Bonus at 30-day streak
    STREAK_100: 2000,       // Legendary bonus
    TASK_COMPLETED: 15,     // XP per task completed
    FOCUS_SESSION: 5,       // XP per focus session minute (capped)
} as const;

export const LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500,     // 1-10
    7000, 9000, 11500, 14500, 18000, 22000, 27000, 33000, 40000, 50000, // 11-20
];

export function calculateLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_THRESHOLDS[i]!) return i + 1;
    }
    return 1;
}

export function xpToNextLevel(xp: number): { current: number; next: number; progress: number } {
    const level = calculateLevel(xp);
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 10000;
    const progress = Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100);
    return { current: currentThreshold, next: nextThreshold, progress };
}

// ── Gentle Streak Calculator ───────────────────────────────────────────

export interface GentleStreakResult {
    currentStreak: number;
    mercyDaysUsed: number;
    isMercyActive: boolean;     // currently in a mercy gap
    streakHealth: "strong" | "at_risk" | "recovering" | "broken";
    longestStreak: number;
}

/**
 * Calculate streak with mercy day support.
 * Walks backward through periods; if a period has no log, it counts as
 * a mercy day (up to `mercyDaysAllowed`). Once mercy is exhausted, streak breaks.
 */
export async function calculateGentleStreak(habitId: string): Promise<GentleStreakResult> {
    const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        include: { logs: { orderBy: { loggedAt: "desc" } } },
    });

    if (!habit || habit.logs.length === 0) {
        return { currentStreak: 0, mercyDaysUsed: 0, isMercyActive: false, streakHealth: "broken", longestStreak: habit?.longestStreak ?? 0 };
    }

    const mercyAllowed = habit.mercyDaysAllowed ?? 1;
    const frequency = habit.frequency as Frequency;
    const step = getPeriodStep(frequency);

    // Build set of period keys that have logs
    const loggedPeriods = new Set<number>();
    for (const log of habit.logs) {
        loggedPeriods.add(getPeriodKey(frequency, log.loggedAt));
    }

    const now = new Date();
    let currentPeriod = getPeriodKey(frequency, now);
    let streak = 0;
    let mercyUsed = 0;
    let isMercyActive = false;

    // Allow starting from current or previous period
    if (!loggedPeriods.has(currentPeriod)) {
        const prevPeriod = new Date(currentPeriod);
        prevPeriod.setDate(prevPeriod.getDate() - step);
        if (loggedPeriods.has(prevPeriod.getTime())) {
            // Current period not logged yet — use mercy
            mercyUsed++;
            isMercyActive = true;
            currentPeriod = prevPeriod.getTime();
        }
    }

    // Walk backward
    const MAX_LOOKBACK = 400; // safety limit
    for (let i = 0; i < MAX_LOOKBACK; i++) {
        const periodDate = new Date(currentPeriod);
        periodDate.setDate(periodDate.getDate() - (i * step));
        const key = periodDate.getTime();

        if (loggedPeriods.has(key)) {
            streak++;
        } else {
            mercyUsed++;
            if (mercyUsed > mercyAllowed) break; // streak ended
        }
    }

    let streakHealth: GentleStreakResult["streakHealth"] = "strong";
    if (mercyUsed > 0 && mercyUsed <= mercyAllowed) streakHealth = "at_risk";
    if (isMercyActive) streakHealth = "recovering";
    if (streak === 0) streakHealth = "broken";

    return {
        currentStreak: streak,
        mercyDaysUsed: mercyUsed,
        isMercyActive,
        streakHealth,
        longestStreak: Math.max(habit.longestStreak, streak),
    };
}

// ── XP Award ───────────────────────────────────────────────────────────

export async function awardXP(userId: string, amount: number, _reason?: string): Promise<{ xp: number; level: number; levelUp: boolean }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const oldLevel = calculateLevel(user.xp ?? 0);
    const newXP = (user.xp ?? 0) + amount;
    const newLevel = calculateLevel(newXP);

    await prisma.user.update({
        where: { id: userId },
        data: { xp: newXP, level: newLevel },
    });

    return { xp: newXP, level: newLevel, levelUp: newLevel > oldLevel };
}

/**
 * Award streak bonus XP at milestones
 */
export function getStreakBonusXP(streak: number): number {
    if (streak >= 100) return XP_REWARDS.STREAK_100;
    if (streak >= 30) return XP_REWARDS.STREAK_30;
    if (streak >= 14) return XP_REWARDS.STREAK_14;
    if (streak >= 7) return XP_REWARDS.STREAK_7;
    if (streak >= 3) return XP_REWARDS.STREAK_3;
    return 0;
}

// ── 365-Day Heatmap Data ───────────────────────────────────────────────

export interface HeatmapDay {
    date: string;    // "YYYY-MM-DD"
    count: number;   // total completions that day
    intensity: 0 | 1 | 2 | 3 | 4;  // GitHub-style intensity
}

export async function getYearlyHeatmap(userId: string): Promise<HeatmapDay[]> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);

    const logs = await prisma.habitLog.findMany({
        where: {
            habit: { userId },
            loggedAt: { gte: oneYearAgo },
        },
        select: { loggedAt: true, completedValue: true },
    });

    // Also include task completions
    const taskCompletions = await prisma.taskCompletionStat.findMany({
        where: {
            userId,
            completedAt: { gte: oneYearAgo },
        },
        select: { completedAt: true },
    });

    // Also include activity logs
    const activityLogs = await prisma.activityLog.findMany({
        where: {
            task: { userId },
            startTime: { gte: oneYearAgo },
        },
        select: { startTime: true, durationMinutes: true },
    });

    // Build day map
    const dayMap = new Map<string, number>();
    const today = new Date();
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
        dayMap.set(d.toISOString().split("T")[0]!, 0);
    }

    for (const log of logs) {
        const key = log.loggedAt.toISOString().split("T")[0]!;
        dayMap.set(key, (dayMap.get(key) ?? 0) + (log.completedValue ?? 1));
    }
    for (const tc of taskCompletions) {
        const key = tc.completedAt.toISOString().split("T")[0]!;
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }
    for (const al of activityLogs) {
        const key = al.startTime.toISOString().split("T")[0]!;
        const sessions = Math.ceil((al.durationMinutes ?? 0) / 30); // 1 point per 30 mins
        dayMap.set(key, (dayMap.get(key) ?? 0) + Math.max(1, sessions));
    }

    // Calculate intensity thresholds
    const values = Array.from(dayMap.values()).filter(v => v > 0);
    const maxVal = Math.max(...values, 1);
    const q1 = maxVal * 0.25;
    const q2 = maxVal * 0.5;
    const q3 = maxVal * 0.75;

    const result: HeatmapDay[] = [];
    for (const [date, count] of dayMap.entries()) {
        let intensity: 0 | 1 | 2 | 3 | 4 = 0;
        if (count > 0 && count <= q1) intensity = 1;
        else if (count <= q2) intensity = 2;
        else if (count <= q3) intensity = 3;
        else if (count > q3) intensity = 4;

        result.push({ date, count, intensity });
    }

    return result;
}

// ── Auto-link: Category task completion → habit log ────────────────────

export async function autoLogHabitFromCategory(userId: string, categoryId: string): Promise<void> {
    const linkedHabits = await prisma.habit.findMany({
        where: { userId, linkedCategoryId: categoryId },
    });

    for (const habit of linkedHabits) {
        const now = new Date();
        const periodStart = habit.frequency === "WEEKLY" ? startOfWeek(now) : startOfDay(now);
        const periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + getPeriodStep(habit.frequency));

        const existingLog = await prisma.habitLog.findFirst({
            where: {
                habitId: habit.id,
                loggedAt: { gte: periodStart, lt: periodEnd },
            },
        });

        if (!existingLog) {
            await prisma.habitLog.create({
                data: { habitId: habit.id, completedValue: 1, loggedAt: now },
            });

            const streakResult = await calculateGentleStreak(habit.id);
            await prisma.habit.update({
                where: { id: habit.id },
                data: {
                    currentStreak: streakResult.currentStreak,
                    longestStreak: streakResult.longestStreak,
                    mercyDaysUsed: streakResult.mercyDaysUsed,
                    lastLogDate: now,
                },
            });

            // Award XP
            const bonusXP = getStreakBonusXP(streakResult.currentStreak);
            await awardXP(userId, XP_REWARDS.HABIT_LOG + bonusXP);
        }
    }
}
