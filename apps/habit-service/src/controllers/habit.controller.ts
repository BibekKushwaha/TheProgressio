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
    getXPForUser,
    invalidateHeatmapCache,
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
import { getLatencySnapshot, getMetricsSnapshot, incrementMetric, logMetricEvent } from "../services/metrics.service.js";

type WhatsAppHabitAction = "create" | "update" | "complete";
type HabitActionResponse = {
    handled: boolean;
    action: WhatsAppHabitAction;
    message: string;
    habit?: Record<string, unknown>;
    alreadyLogged?: boolean;
    clarificationRequired?: boolean;
};

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

const inferHabitFrequency = (input: string): Frequency => {
    if (/\b(weekly|every week|per week|each week)\b/i.test(input)) {
        return "WEEKLY";
    }
    return "DAILY";
};

const inferHabitUnit = (input: string): "minutes" | "count" | "pages" | "problems" | "sessions" => {
    if (/\b(min|mins|minute|minutes|hr|hrs|hour|hours)\b/i.test(input)) {
        return "minutes";
    }
    if (/\b(page|pages)\b/i.test(input)) {
        return "pages";
    }
    if (/\b(problem|problems|question|questions)\b/i.test(input)) {
        return "problems";
    }
    if (/\b(session|sessions)\b/i.test(input)) {
        return "sessions";
    }
    return "count";
};

const inferHabitTargetValue = (
    input: string,
    frequency: Frequency,
    unit: "minutes" | "count" | "pages" | "problems" | "sessions",
): number => {
    const explicitMatch = input.match(/\b(\d+)\s*(?:min|mins|minutes|hrs|hours|times|x|pages?|problems?|questions?|sessions?)\b/i) ?? input.match(/\b(\d+)\b/);
    const parsed = explicitMatch?.[1] ? Number.parseInt(explicitMatch[1], 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
        if (unit === "minutes" && /\b(hr|hrs|hour|hours)\b/i.test(input)) {
            return parsed * 60;
        }
        return parsed;
    }
    if (unit === "minutes") return 20;
    return frequency === "WEEKLY" ? 3 : 1;
};

const inferHabitCategoryName = (input: string): string | null => {
    const mappings: Array<{ pattern: RegExp; category: string }> = [
        { pattern: /\b(math|algebra|geometry|calculus)\b/i, category: "Math" },
        { pattern: /\b(physics|physic[s]?|physix)\b/i, category: "Physics" },
        { pattern: /\b(chemistry|chemistery|chemis?try|chem)\b/i, category: "Chemistry" },
        { pattern: /\b(biology|biologi|biolgy|bio)\b/i, category: "Biology" },
        { pattern: /\b(english|reading|essay)\b/i, category: "English" },
        { pattern: /\b(history)\b/i, category: "History" },
        { pattern: /\b(code|coding|programming|dsa)\b/i, category: "Coding" },
        { pattern: /\b(revision|study|flashcards|mock test|practice)\b/i, category: "Study" },
    ];

    for (const mapping of mappings) {
        if (mapping.pattern.test(input)) {
            return mapping.category;
        }
    }

    return null;
};

const inferHabitReminderTime = (input: string): string | null => {
    const normalized = input.trim().toLowerCase();
    if (!normalized) return null;

    // 24-hour clock: 15:00 / 15.00
    const twentyFourHourMatch =
        normalized.match(/\b([01]?\d|2[0-3])[:.][0-5]\d\b/) ?? null;
    if (twentyFourHourMatch?.[0]) {
        const token = twentyFourHourMatch[0].replace(".", ":");
        const [h, m] = token.split(":");
        const hours = Number.parseInt(h ?? "", 10);
        const minutes = Number.parseInt(m ?? "", 10);
        if (
            Number.isFinite(hours) &&
            Number.isFinite(minutes) &&
            hours >= 0 &&
            hours <= 23 &&
            minutes >= 0 &&
            minutes <= 59
        ) {
            return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        }
    }

    // 12-hour clock: 3pm / 3 pm / 3:30pm / 3:30 pm
    const twelveHourMatch =
        normalized.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i) ?? null;
    if (twelveHourMatch?.[1] && twelveHourMatch?.[3]) {
        let hours = Number.parseInt(twelveHourMatch[1], 10);
        const minutes = Number.parseInt(twelveHourMatch[2] ?? "0", 10);
        const meridiem = twelveHourMatch[3].toLowerCase();

        if (meridiem === "pm" && hours < 12) hours += 12;
        if (meridiem === "am" && hours === 12) hours = 0;

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    return null;
};

const inferHabitScheduleHint = (input: string): string | null => {
    if (/\b(morning|every morning)\b/i.test(input)) return "morning";
    if (/\b(afternoon|every afternoon)\b/i.test(input)) return "afternoon";
    if (/\b(evening|every evening)\b/i.test(input)) return "evening";
    if (/\b(nightly|night|every night)\b/i.test(input)) return "night";
    return null;
};

const inferHabitName = (input: string): string => {
    const cleaned = input
        .replace(/\b(every day|everyday|daily|every week|weekly|per week|each week|nightly)\b/gi, " ")
        .replace(/\b(morning|afternoon|evening|night)\b/gi, " ")
        .replace(/\b(?:[01]?\d|2[0-3])[:.][0-5]\d\b/g, " ")
        .replace(/\b(1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm)\b/gi, " ")
        .replace(/\b\d+\s*(min|mins|minutes|hrs|hours|times|x|pages?|problems?|questions?|sessions?)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!cleaned) {
        return "Study habit";
    }

    return cleaned
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

const inferHabitConfidence = (input: string): number => {
    let confidence = 0.58;
    if (/\b(every day|daily|every week|weekly)\b/i.test(input)) confidence += 0.15;
    if (/\b\d+\s*(min|mins|minutes|hrs|hours|times|x)\b/i.test(input)) confidence += 0.15;
    if (inferHabitCategoryName(input)) confidence += 0.1;
    return Math.min(0.98, confidence);
};

const sanitizeWhatsAppHabitSpec = (input: string): string =>
    input
        .replace(/\b(create|add|start|new|update|change|edit|modify|complete|completed|done|log|check(?:\s|-)?in)\b/gi, " ")
        .replace(/\bhabit\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

const normalizeHabitReference = (value: string): string =>
    value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

const scoreHabitReference = (reference: string, habitName: string): number => {
    const normalizedReference = normalizeHabitReference(reference);
    const normalizedHabit = normalizeHabitReference(habitName);
    if (!normalizedReference || !normalizedHabit) return 0;
    if (normalizedReference === normalizedHabit) return 1;
    if (normalizedHabit.includes(normalizedReference)) {
        return Math.max(0.92, normalizedReference.length / normalizedHabit.length);
    }
    if (normalizedReference.includes(normalizedHabit)) {
        return Math.max(0.86, normalizedHabit.length / normalizedReference.length);
    }

    const referenceTokens = normalizedReference.split(" ").filter((token) => token.length >= 2);
    const habitTokens = normalizedHabit.split(" ").filter((token) => token.length >= 2);
    if (referenceTokens.length === 0 || habitTokens.length === 0) return 0;

    const habitTokenSet = new Set(habitTokens);
    const overlap = referenceTokens.filter((token) => habitTokenSet.has(token)).length;
    if (overlap === 0) return 0;

    const recall = overlap / referenceTokens.length;
    const precision = overlap / habitTokens.length;
    const jaccard = overlap / new Set([...referenceTokens, ...habitTokens]).size;
    return Number((recall * 0.55 + precision * 0.2 + jaccard * 0.25).toFixed(3));
};

const findBestHabitMatch = async (userId: string, reference: string): Promise<
    | { kind: "match"; habit: any }
    | { kind: "ambiguous" }
    | { kind: "none" }
> => {
    const habits = await prisma.habit.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 25,
    });

    const ranked = habits
        .map((habit) => ({
            habit,
            score: scoreHabitReference(reference, habit.name),
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((left, right) => right.score - left.score);

    const best = ranked[0];
    const runnerUp = ranked[1];

    if (!best || best.score < 0.6) return { kind: "none" };
    if (runnerUp && best.score - runnerUp.score < 0.12) return { kind: "ambiguous" };
    return { kind: "match", habit: best.habit };
};

const resolveLinkedCategoryIdByName = async (userId: string, linkedCategoryName: string | null): Promise<string | null> => {
    if (!linkedCategoryName) return null;
    const prismaAny = prisma as any;
    if (typeof prismaAny.category?.findFirst !== "function") return null;

    const category = await prismaAny.category.findFirst({
        where: {
            userId,
            name: {
                equals: linkedCategoryName,
                mode: "insensitive",
            },
        },
        select: { id: true },
    });

    return category?.id ?? null;
};

const parseHabitDraftFromText = async (userId: string, text: string) => {
    const frequency = inferHabitFrequency(text);
    const unit = inferHabitUnit(text);
    const linkedCategoryName = inferHabitCategoryName(text);
    return {
        name: inferHabitName(text),
        frequency,
        targetValue: inferHabitTargetValue(text, frequency, unit),
        reminderTime: inferHabitReminderTime(text),
        scheduleHint: inferHabitReminderTime(text) ? null : inferHabitScheduleHint(text),
        linkedCategoryId: await resolveLinkedCategoryIdByName(userId, linkedCategoryName),
        linkedCategoryName,
        confidence: inferHabitConfidence(text),
    };
};

const handleInternalWhatsAppHabitAction = async (params: {
    userId: string;
    action: WhatsAppHabitAction;
    text: string;
}): Promise<HabitActionResponse> => {
    const trimmedText = params.text.trim();

    if (params.action === "create") {
        const spec = sanitizeWhatsAppHabitSpec(trimmedText);
        if (!spec) {
            return {
                handled: true,
                action: "create",
                clarificationRequired: true,
                message: "Please describe the habit more clearly, for example: 'create habit revise chemistry 20 min every day'.",
            };
        }

        const draft = await parseHabitDraftFromText(params.userId, spec);
        const habit = await prisma.habit.create({
            data: {
                name: draft.name,
                frequency: draft.frequency,
                targetValue: draft.targetValue,
                userId: params.userId,
                linkedCategoryId: draft.linkedCategoryId,
                reminderTime: draft.reminderTime,
                scheduleHint: draft.scheduleHint,
                mercyDaysAllowed: 1,
            },
        });

        return {
            handled: true,
            action: "create",
            message: `Habit created: ${habit.name}`,
            habit,
        };
    }

    if (params.action === "update") {
        const updateMatch = trimmedText.match(/\b(?:update|change|edit|modify)\s+habit\s+(.+?)\s+to\s+(.+)$/i);
        if (!updateMatch?.[1] || !updateMatch?.[2]) {
            return {
                handled: true,
                action: "update",
                clarificationRequired: true,
                message: "Please use a message like: 'update habit revise chemistry to revise chemistry 30 min every day 7pm'.",
            };
        }

        const targetReference = updateMatch[1].trim();
        const nextSpec = sanitizeWhatsAppHabitSpec(updateMatch[2].trim());
        const match = await findBestHabitMatch(params.userId, targetReference);

        if (match.kind !== "match") {
            return {
                handled: true,
                action: "update",
                clarificationRequired: true,
                message: "I couldn't tell which habit to update. Please send the habit name more clearly.",
            };
        }

        const draft = await parseHabitDraftFromText(params.userId, nextSpec);
        const updatedHabit = await prisma.habit.update({
            where: { id: match.habit.id },
            data: {
                name: normalizeHabitReference(draft.name) === normalizeHabitReference("Study habit")
                    ? match.habit.name
                    : draft.name,
                frequency: draft.frequency,
                targetValue: draft.targetValue,
                linkedCategoryId: draft.linkedCategoryId,
                reminderTime: draft.reminderTime,
                scheduleHint: draft.scheduleHint,
            },
        });

        return {
            handled: true,
            action: "update",
            message: `Habit updated: ${updatedHabit.name}`,
            habit: updatedHabit,
        };
    }

    const completionReference = sanitizeWhatsAppHabitSpec(trimmedText);
    const match = await findBestHabitMatch(params.userId, completionReference);
    if (match.kind !== "match") {
        return {
            handled: true,
            action: "complete",
            clarificationRequired: true,
            message: "I couldn't tell which habit to complete. Please send the habit name more clearly, for example: 'complete habit revise chemistry'.",
        };
    }

    const result = await logHabitCompletionInternal({ habitId: match.habit.id, completedValue: 1 });
    if (result.status === "already_logged") {
        return {
            handled: true,
            action: "complete",
            message: `${match.habit.name} is already logged for this period.`,
            habit: result.habit,
            alreadyLogged: true,
        };
    }

    if (result.status === "not_found") {
        return {
            handled: true,
            action: "complete",
            clarificationRequired: true,
            message: "I couldn't find that habit anymore. Please try again from the app.",
        };
    }

    return {
        handled: true,
        action: "complete",
        message: `Habit logged: ${match.habit.name}`,
        habit: result.habit,
    };
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

export const handleInternalWhatsAppAction = TryCatch(async (req: Request, res: Response): Promise<void> => {
    const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
    const action = typeof req.body?.action === "string" ? req.body.action.trim().toLowerCase() : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!userId || !text || !["create", "update", "complete"].includes(action)) {
        throw new ErrorHandler(400, "userId, action, and text are required");
    }

    const result = await handleInternalWhatsAppHabitAction({
        userId,
        action: action as WhatsAppHabitAction,
        text,
    });

    res.status(result.action === "create" && !result.clarificationRequired ? 201 : 200).json(result);
});

// Internal helper for lightweight nudge/dispatch counters + per-endpoint latency
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
        latency: getLatencySnapshot(),
    });
});

// POST /api/habits/parse
export const parseHabit = TryCatch(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text) {
        throw new ErrorHandler(400, "text is required");
    }

    const frequency = inferHabitFrequency(text);
    const unit = inferHabitUnit(text);
    const reminderTime = inferHabitReminderTime(text);
    res.status(200).json({
        name: inferHabitName(text),
        frequency,
        targetValue: inferHabitTargetValue(text, frequency, unit),
        unit,
        linkedCategoryName: inferHabitCategoryName(text),
        scheduleHint: reminderTime ? null : inferHabitScheduleHint(text),
        reminderTime,
        confidence: inferHabitConfidence(text),
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
        // awardXP performs a write-through XP cache update.
        // Also invalidate heatmap — this log adds a new data point.
        void invalidateHeatmapCache(habit.userId).catch(() => { /* non-blocking */ });
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
    const reminderTime = req.body?.reminderTime;
    const scheduleHint = req.body?.scheduleHint;

    const parsed = habitSchema.safeParse({
        name,
        frequency,
        targetValue,
        icon,
        color,
        mercyDaysAllowed,
        categoryId: linkedCategoryId || undefined,
        reminderTime,
        scheduleHint,
    });

    if (!parsed.success) {
        throw new ErrorHandler(400, "Invalid habit data");
    }

    const reminderTimeValue = parsed.data.reminderTime ?? null;
    const scheduleHintValue = reminderTimeValue ? null : parsed.data.scheduleHint ?? null;

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
            reminderTime: reminderTimeValue,
            scheduleHint: scheduleHintValue,
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

    const {
        name,
        frequency,
        targetValue,
        icon,
        color,
        mercyDaysAllowed,
        categoryId: linkedCategoryId,
        reminderTime,
        scheduleHint,
    } = parsed.data;

    const habit = await prisma.habit.findFirst({
        where: { id, userId },
    });

    if (!habit) {
        throw new ErrorHandler(404, "Habit not found");
    }

    let reminderTimeValue =
        reminderTime !== undefined ? reminderTime : (habit as any).reminderTime ?? null;
    let scheduleHintValue =
        scheduleHint !== undefined ? scheduleHint : (habit as any).scheduleHint ?? null;

    // Enforce mutual exclusivity:
    // - If a reminder time is present, it wins and scheduleHint is cleared.
    // - If scheduleHint is explicitly set, clear any existing reminder time.
    if (typeof reminderTimeValue === "string" && reminderTimeValue.length > 0) {
        scheduleHintValue = null;
    } else if (scheduleHint !== undefined && scheduleHintValue) {
        reminderTimeValue = null;
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
            reminderTime: reminderTimeValue,
            scheduleHint: scheduleHintValue,
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

// ── Dashboard Bootstrap ───────────────────────────────────────────────

/**
 * GET /habits/bootstrap/critical — habits + XP only.
 *
 * This is the "first paint" payload used by React streaming.  It skips
 * the heatmap (3 DB queries + 365-day aggregation) and nudges so the
 * critical content (habit cards + level card) can stream to the browser
 * as quickly as possible.  The secondary bootstrap fills in the rest.
 */
export const getBootstrapCritical = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) throw new ErrorHandler(401, "Unauthorized");

    const habitsRaw = await prisma.habit.findMany({
        where: { userId },
        include: { logs: { orderBy: { loggedAt: 'desc' }, take: 30 } },
        orderBy: { createdAt: 'desc' },
    });

    const [habitsWithStreaks, xp] = await Promise.all([
        Promise.all(
            habitsRaw.map(async (habit) => {
                const sr = await calculateGentleStreak(habit.id);
                return {
                    ...habit,
                    currentStreak: sr.currentStreak,
                    streakStatus: getStreakStatus(habit.lastLogDate, habit.frequency),
                    streakHealth: sr.streakHealth,
                    mercyDaysUsed: sr.mercyDaysUsed,
                    isMercyActive: sr.isMercyActive,
                };
            })
        ),
        getXPForUser(userId),
    ]);

    res.status(200).json({ message: "Critical bootstrap loaded", habits: habitsWithStreaks, xp });
});

/**
 * GET /habits/bootstrap — full payload: habits + XP + heatmap + nudges.
 *
 * Nudge side-effects (detectStreakRisks, detectExamWarnings) are fired
 * as fire-and-forget so they never block the response.  Only the read
 * path (getUserNudges) is awaited.
 *
 * Used by:
 *  • The RSC prefetch (server-side) for immediate first paint (revalidate 30 s).
 *  • useGetDashboardBootstrapQuery (client-side fallback + post-mutation refetch).
 */
export const getBootstrap = TryCatch(async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) throw new ErrorHandler(401, "Unauthorized");

    const habitsRaw = await prisma.habit.findMany({
        where: { userId },
        include: { logs: { orderBy: { loggedAt: 'desc' }, take: 30 } },
        orderBy: { createdAt: 'desc' },
    });

    if (!habitsRaw) throw new ErrorHandler(404, "User not found");

    // Fire risk-detection in the background — these write nudge rows to the DB
    // but we’ll read whatever exists regardless of whether they’ve finished.
    // After both detectors settle, enqueue any newly-created due nudges for push dispatch.
    void Promise.allSettled([
        detectStreakRisks(userId),
        detectExamWarnings(userId),
    ]).then(() =>
        enqueueDueNudgeDispatchJobs(20).catch(() => { /* non-blocking */ })
    ).catch(() => { /* non-blocking */ });

    // All reads run in parallel — heatmap and nudges are now both cached.
    const [habitsWithStreaks, xp, heatmap, nudges] = await Promise.all([
        Promise.all(
            habitsRaw.map(async (habit) => {
                const sr = await calculateGentleStreak(habit.id);
                return {
                    ...habit,
                    currentStreak: sr.currentStreak,
                    streakStatus: getStreakStatus(habit.lastLogDate, habit.frequency),
                    streakHealth: sr.streakHealth,
                    mercyDaysUsed: sr.mercyDaysUsed,
                    isMercyActive: sr.isMercyActive,
                };
            })
        ),
        getXPForUser(userId),
        getYearlyHeatmap(userId),
        getUserNudges(userId, false),
    ]);

    const totalContributions = heatmap.reduce((s, d) => s + d.count, 0);
    const activeDays = heatmap.filter((d) => d.count > 0).length;
    // Use the heatmap window itself as the "total days" baseline.
    const relevantTotalDays = Math.max(1, heatmap.length);

    res.status(200).json({
        message: "Bootstrap loaded successfully",
        habits: habitsWithStreaks,
        xp,
        heatmap,
        heatmapSummary: {
            totalContributions,
            activeDays,
            totalDays: relevantTotalDays,
            consistencyRate: Math.round((activeDays / relevantTotalDays) * 100),
        },
        nudges,
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
