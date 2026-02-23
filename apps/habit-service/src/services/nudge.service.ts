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
import { incrementMetric, logMetricEvent } from "./metrics.service.js";

// ── Nudge Types ────────────────────────────────────────────────────────

export const NUDGE_TYPES = {
    URGENCY_DRIVEN: "URGENCY_DRIVEN",
    BEHAVIORAL_NUDGE: "BEHAVIORAL_NUDGE",
    ADVANCE_ALERT_3WEEK: "ADVANCE_ALERT_3WEEK",
    TRANSACTION_SYSTEM: "TRANSACTION_SYSTEM",
    DIGEST_SUMMARY: "DIGEST_SUMMARY",
    STREAK_RISK: "STREAK_RISK",
    EXAM_WARNING: "EXAM_WARNING",
    MORNING_BRIEFING: "MORNING_BRIEFING",
    SLIP_DETECTION: "SLIP_DETECTION",
    RECOVERY_SUGGESTION: "RECOVERY_SUGGESTION",
    SYSTEM_PREFS: "SYSTEM_PREFS",
} as const;

export type NotificationBucket =
    | "URGENCY_DRIVEN"
    | "MORNING_BRIEFING"
    | "BEHAVIORAL_NUDGE"
    | "ADVANCE_ALERT_3WEEK"
    | "TRANSACTION_SYSTEM";

export interface QuietHoursWindow {
    start: string; // HH:mm
    end: string;   // HH:mm
}

export interface FocusProfile {
    label: string;
    enabled: boolean;
    muteNonUrgent: boolean;
}

export interface NotificationSettings {
    enabledBuckets: Record<NotificationBucket, boolean>;
    quietHours: QuietHoursWindow[];
    focusProfiles: FocusProfile[];
    groupedSummaries: boolean;
    positiveTone: boolean;
    preDeadlineDays: 1 | 2 | 3;
    streakReminderTime: string;
    timezone: string;
    timezoneOffsetMinutes: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
    enabledBuckets: {
        URGENCY_DRIVEN: true,
        MORNING_BRIEFING: true,
        BEHAVIORAL_NUDGE: true,
        ADVANCE_ALERT_3WEEK: true,
        TRANSACTION_SYSTEM: true,
    },
    quietHours: [],
    focusProfiles: [],
    groupedSummaries: true,
    positiveTone: true,
    preDeadlineDays: 2,
    streakReminderTime: "09:00",
    timezone: "UTC",
    timezoneOffsetMinutes: 0,
};

const INTERNAL_SETTINGS_TITLE = "Notification settings";

const parseMetadata = (raw: string | null | undefined): Record<string, unknown> => {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        return parsed as Record<string, unknown>;
    } catch {
        return {};
    }
};

const isValidTime = (value: string): boolean => /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(value);
const isValidPreDeadlineDays = (value: unknown): value is 1 | 2 | 3 =>
    value === 1 || value === 2 || value === 3;
const isValidTimezoneOffsetMinutes = (value: unknown): value is number =>
    typeof value === "number" && Number.isInteger(value) && value >= -840 && value <= 840;
const isValidTimezone = (value: unknown): value is string => {
    if (typeof value !== "string" || value.length < 3 || value.length > 64) return false;
    try {
        Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
        return true;
    } catch {
        return false;
    }
};

const toMinutes = (value: string): number => {
    const [h = "0", m = "0"] = value.split(":");
    return Number.parseInt(h, 10) * 60 + Number.parseInt(m, 10);
};

const isWithinWindow = (valueMinutes: number, window: QuietHoursWindow): boolean => {
    const start = toMinutes(window.start);
    const end = toMinutes(window.end);
    if (start === end) return true;
    if (start < end) {
        return valueMinutes >= start && valueMinutes < end;
    }
    return valueMinutes >= start || valueMinutes < end;
};

const normalizeSettings = (candidate: unknown): NotificationSettings => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        return DEFAULT_SETTINGS;
    }

    const record = candidate as Record<string, unknown>;
    const bucketsInput =
        record.enabledBuckets && typeof record.enabledBuckets === "object" && !Array.isArray(record.enabledBuckets)
            ? (record.enabledBuckets as Record<string, unknown>)
            : {};

    const enabledBuckets: Record<NotificationBucket, boolean> = {
        URGENCY_DRIVEN: typeof bucketsInput.URGENCY_DRIVEN === "boolean" ? bucketsInput.URGENCY_DRIVEN : DEFAULT_SETTINGS.enabledBuckets.URGENCY_DRIVEN,
        MORNING_BRIEFING: typeof bucketsInput.MORNING_BRIEFING === "boolean" ? bucketsInput.MORNING_BRIEFING : DEFAULT_SETTINGS.enabledBuckets.MORNING_BRIEFING,
        BEHAVIORAL_NUDGE: typeof bucketsInput.BEHAVIORAL_NUDGE === "boolean" ? bucketsInput.BEHAVIORAL_NUDGE : DEFAULT_SETTINGS.enabledBuckets.BEHAVIORAL_NUDGE,
        ADVANCE_ALERT_3WEEK: typeof bucketsInput.ADVANCE_ALERT_3WEEK === "boolean" ? bucketsInput.ADVANCE_ALERT_3WEEK : DEFAULT_SETTINGS.enabledBuckets.ADVANCE_ALERT_3WEEK,
        TRANSACTION_SYSTEM: typeof bucketsInput.TRANSACTION_SYSTEM === "boolean" ? bucketsInput.TRANSACTION_SYSTEM : DEFAULT_SETTINGS.enabledBuckets.TRANSACTION_SYSTEM,
    };

    const quietHours = Array.isArray(record.quietHours)
        ? record.quietHours
            .filter((item): item is QuietHoursWindow => {
                if (!item || typeof item !== "object" || Array.isArray(item)) return false;
                const data = item as Record<string, unknown>;
                return typeof data.start === "string" && typeof data.end === "string" && isValidTime(data.start) && isValidTime(data.end);
            })
            .map((item) => ({ start: item.start, end: item.end }))
        : [];

    const focusProfiles = Array.isArray(record.focusProfiles)
        ? record.focusProfiles
            .filter((item): item is FocusProfile => {
                if (!item || typeof item !== "object" || Array.isArray(item)) return false;
                const data = item as Record<string, unknown>;
                return (
                    typeof data.label === "string" &&
                    typeof data.enabled === "boolean" &&
                    typeof data.muteNonUrgent === "boolean"
                );
            })
            .map((item) => ({
                label: item.label,
                enabled: item.enabled,
                muteNonUrgent: item.muteNonUrgent,
            }))
        : [];

    return {
        enabledBuckets,
        quietHours,
        focusProfiles,
        groupedSummaries:
            typeof record.groupedSummaries === "boolean" ? record.groupedSummaries : DEFAULT_SETTINGS.groupedSummaries,
        positiveTone: typeof record.positiveTone === "boolean" ? record.positiveTone : DEFAULT_SETTINGS.positiveTone,
        preDeadlineDays: isValidPreDeadlineDays(record.preDeadlineDays) ? record.preDeadlineDays : DEFAULT_SETTINGS.preDeadlineDays,
        streakReminderTime:
            typeof record.streakReminderTime === "string" && isValidTime(record.streakReminderTime)
                ? record.streakReminderTime
                : DEFAULT_SETTINGS.streakReminderTime,
        timezone: isValidTimezone(record.timezone) ? record.timezone : DEFAULT_SETTINGS.timezone,
        timezoneOffsetMinutes: isValidTimezoneOffsetMinutes(record.timezoneOffsetMinutes)
            ? record.timezoneOffsetMinutes
            : DEFAULT_SETTINGS.timezoneOffsetMinutes,
    };
};

const mergeSettings = (
    current: NotificationSettings,
    partial: Partial<NotificationSettings>,
): NotificationSettings => normalizeSettings({
    ...current,
    ...partial,
    enabledBuckets: {
        ...current.enabledBuckets,
        ...(partial.enabledBuckets ?? {}),
    },
});

const getBucketForType = (type: string): NotificationBucket => {
    if (type === NUDGE_TYPES.MORNING_BRIEFING) return "MORNING_BRIEFING";
    if (type === NUDGE_TYPES.EXAM_WARNING || type === NUDGE_TYPES.ADVANCE_ALERT_3WEEK) return "ADVANCE_ALERT_3WEEK";
    if (type === NUDGE_TYPES.TRANSACTION_SYSTEM) return "TRANSACTION_SYSTEM";
    if (type === NUDGE_TYPES.URGENCY_DRIVEN) return "URGENCY_DRIVEN";
    return "BEHAVIORAL_NUDGE";
};

const isUrgentType = (type: string): boolean =>
    type === NUDGE_TYPES.URGENCY_DRIVEN || type === NUDGE_TYPES.STREAK_RISK;

const shouldSendWithCurrentContext = (
    settings: NotificationSettings,
    nudgeType: string,
    now: Date,
): boolean => {
    const bucket = getBucketForType(nudgeType);
    if (!settings.enabledBuckets[bucket]) return false;

    const urgent = isUrgentType(nudgeType);
    if (!urgent) {
        const minute = now.getHours() * 60 + now.getMinutes();
        const inQuietHours = settings.quietHours.some((window) => isWithinWindow(minute, window));
        if (inQuietHours) return false;

        const activeMutedProfile = settings.focusProfiles.some((profile) => profile.enabled && profile.muteNonUrgent);
        if (activeMutedProfile) return false;
    }

    return true;
};

const computePreferredNudgeTime = (timestamps: Date[], fallback: Date): Date => {
    if (timestamps.length === 0) return fallback;
    const averageHour = Math.round(
        timestamps.reduce((sum, value) => sum + value.getHours(), 0) / timestamps.length,
    );

    const scheduled = new Date(fallback);
    scheduled.setMinutes(0, 0, 0);
    scheduled.setHours(Math.max(6, Math.min(22, averageHour)));
    if (scheduled.getTime() < fallback.getTime()) {
        scheduled.setDate(scheduled.getDate() + 1);
    }
    return scheduled;
};

const getZonedParts = (date: Date, timezone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } => {
    const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const parts = dtf.formatToParts(date);
    const pick = (type: Intl.DateTimeFormatPartTypes): number =>
        Number.parseInt(parts.find((part) => part.type === type)?.value ?? "0", 10);
    return {
        year: pick("year"),
        month: pick("month"),
        day: pick("day"),
        hour: pick("hour"),
        minute: pick("minute"),
        second: pick("second"),
    };
};

const getTimeZoneOffsetAt = (date: Date, timezone: string): number => {
    const zoned = getZonedParts(date, timezone);
    const asUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
    return Math.round((asUtc - date.getTime()) / 60_000);
};

const getIsoLocalDate = (date: Date, timezone: string): string => {
    const zoned = getZonedParts(date, timezone);
    const mm = `${zoned.month}`.padStart(2, "0");
    const dd = `${zoned.day}`.padStart(2, "0");
    return `${zoned.year}-${mm}-${dd}`;
};

const buildReminderDateFromTime = (
    time: string,
    fallback: Date,
    timezone: string,
    timezoneOffsetMinutes: number,
): Date => {
    const [h = "9", m = "0"] = time.split(":");
    const targetHour = Number.parseInt(h, 10);
    const targetMinute = Number.parseInt(m, 10);

    if (!isValidTimezone(timezone)) {
        const localNow = new Date(fallback.getTime() - timezoneOffsetMinutes * 60_000);
        const scheduledLocal = new Date(localNow);
        scheduledLocal.setHours(targetHour, targetMinute, 0, 0);
        if (scheduledLocal.getTime() < localNow.getTime()) scheduledLocal.setDate(scheduledLocal.getDate() + 1);
        return new Date(scheduledLocal.getTime() + timezoneOffsetMinutes * 60_000);
    }

    const localNow = getZonedParts(fallback, timezone);
    let y = localNow.year;
    let mo = localNow.month;
    let d = localNow.day;
    if (targetHour < localNow.hour || (targetHour === localNow.hour && targetMinute <= localNow.minute)) {
        const next = new Date(Date.UTC(y, mo - 1, d + 1, 0, 0, 0));
        y = next.getUTCFullYear();
        mo = next.getUTCMonth() + 1;
        d = next.getUTCDate();
    }

    const candidateUtc = Date.UTC(y, mo - 1, d, targetHour, targetMinute, 0);
    const offset = getTimeZoneOffsetAt(new Date(candidateUtc), timezone);
    return new Date(candidateUtc - offset * 60_000);
};

const toDigestNudge = (userId: string, nudges: Nudge[]): Nudge => {
    const priorityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
    const highestPriority = nudges
        .map((item) => item.priority)
        .sort((a, b) => priorityOrder[b] - priorityOrder[a])[0] ?? "MEDIUM";

    const lines = nudges.slice(0, 4).map((item) => `• ${item.title}`);
    const sourceIds = nudges.map((item) => item.id);
    const metadata: Record<string, unknown> = {
        sourceNudgeIds: sourceIds,
        count: nudges.length,
        digest: true,
    };

    // If any source id is a valid UUID, expose a primary nudge id for actions
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const primary = sourceIds.find((id) => typeof id === 'string' && uuidRegex.test(id));
    if (primary) metadata.nudgeId = primary;

    return {
        id: `digest-${Date.now()}`,
        userId,
        type: NUDGE_TYPES.DIGEST_SUMMARY,
        title: `You have ${nudges.length} updates`,
        message: lines.join("\n"),
        priority: highestPriority,
        isRead: false,
        scheduledAt: new Date(),
        expiresAt: null,
        metadata: JSON.stringify(metadata),
        createdAt: new Date(),
    } as Nudge;
};

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
    const settingsRecord = await prisma.nudge.findFirst({
        where: {
            userId,
            type: NUDGE_TYPES.SYSTEM_PREFS,
            title: INTERNAL_SETTINGS_TITLE,
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
    });

    const parsed = parseMetadata(settingsRecord?.metadata ?? null);
    return normalizeSettings(parsed.settings);
}

export async function upsertNotificationSettings(
    userId: string,
    partial: Partial<NotificationSettings>,
): Promise<NotificationSettings> {
    const current = await getNotificationSettings(userId);
    const merged = mergeSettings(current, partial);

    await prisma.nudge.create({
        data: {
            userId,
            type: NUDGE_TYPES.SYSTEM_PREFS,
            title: INTERNAL_SETTINGS_TITLE,
            message: "User notification settings updated",
            priority: "LOW",
            isRead: true,
            metadata: JSON.stringify({ settings: merged }),
        },
    });

    return merged;
}

// ── Streak Risk Detection ──────────────────────────────────────────────

export async function detectStreakRisks(userId: string): Promise<void> {
    const settings = await getNotificationSettings(userId);
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
            const localDate = getIsoLocalDate(now, settings.timezone);
            const idempotencyKey = `streak:${userId}:${localDate}`;
            const existing = await prisma.nudge.findFirst({
                where: {
                    userId,
                    type: NUDGE_TYPES.STREAK_RISK,
                    localDate,
                },
            });

            if (!existing) {
                const mercyRemaining = (habit.mercyDaysAllowed ?? 1) - (habit.mercyDaysUsed ?? 0);
                const recentLogTimes = habit.logs.map((log) => log.loggedAt);
                const fallback = computePreferredNudgeTime(recentLogTimes, now);
                const scheduledAt = buildReminderDateFromTime(
                    settings.streakReminderTime,
                    fallback,
                    settings.timezone,
                    settings.timezoneOffsetMinutes,
                );

                try {
                    await prisma.nudge.create({
                        data: {
                            userId,
                            type: NUDGE_TYPES.STREAK_RISK,
                            title: `${habit.name} streak at risk!`,
                            message: mercyRemaining > 0
                                ? `You’re doing great — one quick check-in keeps your ${habit.currentStreak}-day "${habit.name}" streak moving.`
                                : `A short session now will protect your progress on "${habit.name}" and keep momentum strong.`,
                            priority: mercyRemaining === 0 ? "HIGH" : "MEDIUM",
                            scheduledAt,
                            localDate,
                            idempotencyKey,
                            metadata: JSON.stringify({
                                habitId: habit.id,
                                streak: habit.currentStreak,
                                mercyRemaining,
                                bucket: "BEHAVIORAL_NUDGE",
                                idempotencyKey,
                                localDate,
                                quickActions: ["MARK_COMPLETED", "SNOOZE_1_HOUR", "BREAK_IT_DOWN"],
                            }),
                        },
                    });
                } catch (error) {
                    if ((error as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
                        incrementMetric("duplicate_prevention_hits");
                        logMetricEvent("streak_duplicate_prevented", { userId, idempotencyKey });
                        break;
                    }
                    incrementMetric("failed_scheduling_attempts");
                    throw error;
                }
                break;
            }
            incrementMetric("duplicate_prevention_hits");
            logMetricEvent("streak_duplicate_prevented", { userId, idempotencyKey });
        }
    }
}

// ── Exam Warning (3-week advance) ──────────────────────────────────────

export async function detectExamWarnings(userId: string): Promise<void> {
    const settings = await getNotificationSettings(userId);
    const maxLeadDays = 21;
    const leadDays = new Set<number>([settings.preDeadlineDays, 21, 14, 7, 1]);
    const horizon = Math.max(...Array.from(leadDays));
    const futureLimit = new Date();
    futureLimit.setDate(futureLimit.getDate() + Math.max(maxLeadDays, horizon));

    const upcomingExams = await prisma.exam.findMany({
        where: {
            userId,
            date: { gte: new Date(), lte: futureLimit },
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

        if (!existing && leadDays.has(daysUntil)) {
            const scheduledAt = new Date();
            if (daysUntil >= 7) {
                const localScheduled = buildReminderDateFromTime("18:00", new Date(), settings.timezone, settings.timezoneOffsetMinutes);
                scheduledAt.setTime(localScheduled.getTime());
            }

            try {
                await prisma.nudge.create({
                    data: {
                        userId,
                        type: NUDGE_TYPES.ADVANCE_ALERT_3WEEK,
                        title: `${exam.title} in ${daysUntil} day(s)!`,
                        message: `Your ${exam.subject?.name ?? "exam"} "${exam.title}" is on ${exam.date.toLocaleDateString()}. ${daysUntil <= 3 ? "You’re close — lock in a final revision block." : "A short review block today keeps prep stress low."}`,
                        priority: daysUntil <= 3 ? "HIGH" : "MEDIUM",
                        scheduledAt,
                        expiresAt: exam.date,
                        metadata: JSON.stringify({
                            examId: exam.id,
                            subjectId: exam.subjectId,
                            daysUntil,
                            bucket: "ADVANCE_ALERT_3WEEK",
                            quickActions: ["MARK_COMPLETED", "SNOOZE_1_HOUR", "BREAK_IT_DOWN"],
                        }),
                    },
                });
                logMetricEvent("exam_warning_scheduled", {
                    userId,
                    examId: exam.id,
                    scheduled_at_utc: scheduledAt.toISOString(),
                });
            } catch (error) {
                incrementMetric("failed_scheduling_attempts");
                throw error;
            }
        }
    }
}

export async function reschedulePendingStreakNudges(
    userId: string,
    streakReminderTime: string,
    timezone: string,
    timezoneOffsetMinutes: number,
): Promise<number> {
    const now = new Date();
    const pending = await prisma.nudge.findMany({
        where: {
            userId,
            type: NUDGE_TYPES.STREAK_RISK,
            scheduledAt: { gt: now },
        },
        select: { id: true, scheduledAt: true },
        take: 200,
    });

    for (const nudge of pending) {
        const adjusted = buildReminderDateFromTime(streakReminderTime, nudge.scheduledAt, timezone, timezoneOffsetMinutes);
        await prisma.nudge.update({
            where: { id: nudge.id },
            data: { scheduledAt: adjusted },
        });
    }

    incrementMetric("reschedule_operations", pending.length);
    logMetricEvent("streak_rescheduled", { userId, updated: pending.length });
    return pending.length;
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

    // Conflict detection: overlapping timetable slots today + class/exam collisions
    const dayOfWeek = now.getDay();
    const timetable = await prisma.timetable.findMany({
        where: { userId, dayOfWeek },
        include: { subject: true },
        orderBy: { startTime: "asc" },
    });
    const todaysExams = await prisma.exam.findMany({
        where: { userId, date: { gte: todayStart, lte: todayEnd } },
        select: { id: true, title: true, date: true, durationMinutes: true },
    });

    const conflicts: string[] = [];
    for (let i = 0; i < timetable.length - 1; i++) {
        const current = timetable[i]!;
        const next = timetable[i + 1]!;
        if (current.endTime > next.startTime) {
            conflicts.push(`${current.subject.name} (${current.startTime}-${current.endTime}) overlaps with ${next.subject.name} (${next.startTime}-${next.endTime})`);
        }
    }

    for (const entry of timetable) {
        const [classStartH = "0", classStartM = "0"] = entry.startTime.split(":");
        const [classEndH = "0", classEndM = "0"] = entry.endTime.split(":");
        const classStart = Number.parseInt(classStartH, 10) * 60 + Number.parseInt(classStartM, 10);
        const classEnd = Number.parseInt(classEndH, 10) * 60 + Number.parseInt(classEndM, 10);

        for (const exam of todaysExams) {
            const examStart = exam.date.getHours() * 60 + exam.date.getMinutes();
            const examEnd = examStart + Math.max(15, exam.durationMinutes);
            const overlap = classStart < examEnd && classEnd > examStart;
            if (!overlap) continue;

            conflicts.push(
                `${entry.subject.name} (${entry.startTime}-${entry.endTime}) overlaps with exam "${exam.title}"`,
            );
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
    const [settings, rawNudges] = await Promise.all([
        getNotificationSettings(userId),
        prisma.nudge.findMany({
            where: {
                userId,
                type: { not: NUDGE_TYPES.SYSTEM_PREFS },
                ...(unreadOnly ? { isRead: false } : {}),
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gte: new Date() } },
                ],
            },
            orderBy: { scheduledAt: "desc" },
            take: 80,
        }),
    ]);

    // Ensure metadata includes a canonical nudgeId for client actions.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const nudges = rawNudges.map((nudge) => {
        try {
            const parsed = parseMetadata(nudge.metadata);
            if (!parsed.nudgeId) {
                if (typeof nudge.id === 'string' && uuidRegex.test(nudge.id)) {
                    parsed.nudgeId = nudge.id;
                }
            }
            return { ...nudge, metadata: JSON.stringify(parsed) } as Nudge;
        } catch {
            return nudge;
        }
    });

    const now = new Date();
    const filtered = nudges.filter((nudge) => shouldSendWithCurrentContext(settings, nudge.type, now));
    if (!settings.groupedSummaries) return filtered.slice(0, 50);

    const nonUrgent = filtered.filter((nudge) => !isUrgentType(nudge.type));
    const urgent = filtered.filter((nudge) => isUrgentType(nudge.type));

    if (nonUrgent.length <= 2) {
        return filtered.slice(0, 50);
    }

    const digest = toDigestNudge(userId, nonUrgent);
    return [digest, ...urgent].slice(0, 50);
}

export async function createTransactionSystemNudge(params: {
    userId: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
}): Promise<Nudge> {
    return prisma.nudge.create({
        data: {
            userId: params.userId,
            type: NUDGE_TYPES.TRANSACTION_SYSTEM,
            title: params.title,
            message: params.message,
            priority: "LOW",
            metadata: JSON.stringify({
                ...(params.metadata ?? {}),
                bucket: "TRANSACTION_SYSTEM",
            }),
        },
    });
}

export async function markNudgeRead(nudgeId: string, userId: string): Promise<Prisma.BatchPayload> {
    return prisma.nudge.updateMany({
        where: { id: nudgeId, userId },
        data: { isRead: true },
    });
}

export async function markAllNudgesRead(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.nudge.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
}
