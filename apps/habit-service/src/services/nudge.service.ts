/**
 * Adaptive Smart Nudges — AI-powered contextual reminders.
 * 
 * Moves beyond standard daily alarms to detect:
 * 1. Streak-at-risk warnings (habit about to break)
 * 2. Exam proximity warnings (3-week advance)
 * 3. Morning briefings with conflict detection
 * 4. Slip detection (pattern-based)
 */
import { prisma, type Nudge, type Prisma } from "@repo/db";

// ── Nudge Types ────────────────────────────────────────────────────────

export const NUDGE_TYPES = {
    STREAK_RISK: "STREAK_RISK",
    EXAM_WARNING: "EXAM_WARNING",
    MORNING_BRIEFING: "MORNING_BRIEFING",
    SLIP_DETECTION: "SLIP_DETECTION",
    RECOVERY_SUGGESTION: "RECOVERY_SUGGESTION",
} as const;

// ── Streak Risk Detection ──────────────────────────────────────────────

export async function detectStreakRisks(userId: string): Promise<void> {
    const habits = await prisma.habit.findMany({
        where: { userId },
        include: { logs: { orderBy: { loggedAt: "desc" }, take: 1 } },
    });

    const now = new Date();

    for (const habit of habits) {
        const lastLog = habit.logs[0];
        if (!lastLog) continue;

        const hoursSinceLastLog = (now.getTime() - lastLog.loggedAt.getTime()) / (1000 * 60 * 60);
        const threshold = habit.frequency === "WEEKLY" ? 144 : 20; // hours before risk

        if (hoursSinceLastLog >= threshold) {
            // Check if we already sent a nudge today
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const existing = await prisma.nudge.findFirst({
                where: {
                    userId,
                    type: NUDGE_TYPES.STREAK_RISK,
                    createdAt: { gte: todayStart },
                    metadata: { contains: habit.id },
                },
            });

            if (!existing) {
                const mercyRemaining = (habit.mercyDaysAllowed ?? 1) - (habit.mercyDaysUsed ?? 0);
                await prisma.nudge.create({
                    data: {
                        userId,
                        type: NUDGE_TYPES.STREAK_RISK,
                        title: `${habit.name} streak at risk!`,
                        message: mercyRemaining > 0
                            ? `You have ${mercyRemaining} mercy day(s) left. Complete "${habit.name}" today to keep your ${habit.currentStreak}-day streak alive.`
                            : `Your ${habit.currentStreak}-day streak for "${habit.name}" will break today if not completed!`,
                        priority: mercyRemaining === 0 ? "HIGH" : "MEDIUM",
                        metadata: JSON.stringify({ habitId: habit.id, streak: habit.currentStreak, mercyRemaining }),
                    },
                });
            }
        }
    }
}

// ── Exam Warning (3-week advance) ──────────────────────────────────────

export async function detectExamWarnings(userId: string): Promise<void> {
    const threeWeeksFromNow = new Date();
    threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21);

    const upcomingExams = await prisma.exam.findMany({
        where: {
            userId,
            date: { gte: new Date(), lte: threeWeeksFromNow },
        },
        include: { subject: true },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const exam of upcomingExams) {
        const daysUntil = Math.ceil((exam.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        const existing = await prisma.nudge.findFirst({
            where: {
                userId,
                type: NUDGE_TYPES.EXAM_WARNING,
                createdAt: { gte: todayStart },
                metadata: { contains: exam.id },
            },
        });

        if (!existing && (daysUntil === 21 || daysUntil === 14 || daysUntil === 7 || daysUntil === 3 || daysUntil === 1)) {
            await prisma.nudge.create({
                data: {
                    userId,
                    type: NUDGE_TYPES.EXAM_WARNING,
                    title: `${exam.title} in ${daysUntil} day(s)!`,
                    message: `Your ${exam.subject?.name ?? "exam"} "${exam.title}" is on ${exam.date.toLocaleDateString()}. ${daysUntil <= 3 ? "Final revision time!" : "Start revising key topics."}`,
                    priority: daysUntil <= 3 ? "HIGH" : "MEDIUM",
                    expiresAt: exam.date,
                    metadata: JSON.stringify({ examId: exam.id, subjectId: exam.subjectId, daysUntil }),
                },
            });
        }
    }
}

// ── Morning Briefing Generator ─────────────────────────────────────────

export interface MorningBriefing {
    dueTasks: number;
    habitsToComplete: number;
    upcomingExams: { title: string; daysUntil: number }[];
    streaksAtRisk: { habitName: string; streak: number }[];
    focusGoalHours: number;
    conflicts: string[];
}

export async function generateMorningBriefing(userId: string): Promise<MorningBriefing> {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    // Due tasks
    const dueTasks = await prisma.task.count({
        where: { userId, status: { not: "COMPLETED" }, dueDate: { lte: todayEnd } },
    });

    // Habits not yet logged today
    const habits = await prisma.habit.findMany({
        where: { userId },
        include: { logs: { where: { loggedAt: { gte: todayStart } }, take: 1 } },
    });
    const habitsToComplete = habits.filter(h => h.logs.length === 0).length;

    // Upcoming exams (next 7 days)
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    const exams = await prisma.exam.findMany({
        where: { userId, date: { gte: todayStart, lte: nextWeek } },
        include: { subject: true },
    });
    const upcomingExams = exams.map(e => ({
        title: `${e.subject?.name ?? ""} - ${e.title}`,
        daysUntil: Math.ceil((e.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Streaks at risk
    const streaksAtRisk = habits
        .filter(h => {
            if (!h.lastLogDate) return false;
            const hoursSince = (now.getTime() - h.lastLogDate.getTime()) / (1000 * 60 * 60);
            return h.frequency === "DAILY" ? hoursSince > 20 : hoursSince > 144;
        })
        .map(h => ({ habitName: h.name, streak: h.currentStreak }));

    // Focus goal
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { dailyGoalHours: true } });

    // Conflict detection: overlapping timetable slots today
    const dayOfWeek = now.getDay();
    const timetable = await prisma.timetable.findMany({
        where: { userId, dayOfWeek },
        include: { subject: true },
        orderBy: { startTime: "asc" },
    });

    const conflicts: string[] = [];
    for (let i = 0; i < timetable.length - 1; i++) {
        const current = timetable[i]!;
        const next = timetable[i + 1]!;
        if (current.endTime > next.startTime) {
            conflicts.push(`${current.subject.name} (${current.startTime}-${current.endTime}) overlaps with ${next.subject.name} (${next.startTime}-${next.endTime})`);
        }
    }

    return {
        dueTasks,
        habitsToComplete,
        upcomingExams,
        streaksAtRisk,
        focusGoalHours: user?.dailyGoalHours ?? 4,
        conflicts,
    };
}

// ── Slip Detection (pattern analysis) ──────────────────────────────────

export async function detectSlipPatterns(userId: string): Promise<{ atRisk: boolean; riskDay: string | null; suggestion: string }> {
    // Look at the last 4 weeks of habit logs to find weak days
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const logs = await prisma.habitLog.findMany({
        where: {
            habit: { userId },
            loggedAt: { gte: fourWeeksAgo },
        },
        select: { loggedAt: true },
    });

    // Count completions by day of week
    const dayCount = new Array(7).fill(0) as number[];
    for (const log of logs) {
        const dayIndex = log.loggedAt.getDay();
        dayCount[dayIndex] = (dayCount[dayIndex] ?? 0) + 1;
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const avgPerDay = dayCount.reduce((a, b) => a + b, 0) / 7;

    // Find the weakest day
    let minDay = 0;
    let minCount = Infinity;
    for (let i = 0; i < 7; i++) {
        if (dayCount[i]! < minCount) {
            minCount = dayCount[i]!;
            minDay = i;
        }
    }

    const today = new Date().getDay();
    const tomorrowDay = (today + 1) % 7;
    const isAtRisk = tomorrowDay === minDay || today === minDay;

    return {
        atRisk: isAtRisk && minCount < avgPerDay * 0.5,
        riskDay: isAtRisk ? dayNames[minDay]! : null,
        suggestion: isAtRisk
            ? `You tend to miss habits on ${dayNames[minDay]}s. Try scheduling a reminder or reducing your target for that day.`
            : "Your habit consistency looks stable!",
    };
}

// ── Fetch User Nudges ──────────────────────────────────────────────────

export async function getUserNudges(userId: string, unreadOnly: boolean = false): Promise<Nudge[]> {
    return prisma.nudge.findMany({
        where: {
            userId,
            ...(unreadOnly ? { isRead: false } : {}),
            OR: [
                { expiresAt: null },
                { expiresAt: { gte: new Date() } },
            ],
        },
        orderBy: { scheduledAt: "desc" },
        take: 50,
    });
}

<<<<<<< HEAD
export async function markNudgeRead(nudgeId: string, userId: string): Promise<Prisma.BatchPayload> {
=======
export async function markNudgeRead(nudgeId: string, userId: string): Promise<{ count: number }> {
>>>>>>> origin/main
    return prisma.nudge.updateMany({
        where: { id: nudgeId, userId },
        data: { isRead: true },
    });
}

<<<<<<< HEAD
export async function markAllNudgesRead(userId: string): Promise<Prisma.BatchPayload> {
=======
export async function markAllNudgesRead(userId: string): Promise<{ count: number }> {
>>>>>>> origin/main
    return prisma.nudge.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
}
