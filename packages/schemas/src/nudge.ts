import { z } from "zod";

const notificationBucketSchema = z.enum([
    "URGENCY_DRIVEN",
    "MORNING_BRIEFING",
    "BEHAVIORAL_NUDGE",
    "ADVANCE_ALERT_3WEEK",
    "TRANSACTION_SYSTEM",
]);

export const nudgeSchema = z.object({
    type: z.enum([
        "URGENCY_DRIVEN",
        "BEHAVIORAL_NUDGE",
        "ADVANCE_ALERT_3WEEK",
        "TRANSACTION_SYSTEM",
        "DIGEST_SUMMARY",
        "STREAK_RISK",
        "EXAM_WARNING",
        "MORNING_BRIEFING",
        "SLIP_DETECTION",
        "RECOVERY_SUGGESTION",
        "SYSTEM_PREFS",
    ]),
    title: z.string().min(1, "Nudge title is required").max(200),
    message: z.string().min(1, "Nudge message is required").max(1000),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    isRead: z.boolean().default(false),
    scheduledAt: z.coerce.date().default(() => new Date()),
    expiresAt: z.coerce.date().optional(),
    metadata: z.string().optional(),
});

export const quietHoursWindowSchema = z.object({
    start: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/),
    end: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/),
});

export const focusProfileSchema = z.object({
    label: z.string().min(1).max(40),
    enabled: z.boolean(),
    muteNonUrgent: z.boolean(),
});

export const notificationSettingsSchema = z.object({
    enabledBuckets: z.record(notificationBucketSchema, z.boolean()),
    quietHours: z.array(quietHoursWindowSchema).default([]),
    focusProfiles: z.array(focusProfileSchema).default([]),
    groupedSummaries: z.boolean().default(true),
    positiveTone: z.boolean().default(true),
    preDeadlineDays: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
    streakReminderTime: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/).default("09:00"),
    timezone: z.string().min(3).max(64).default("UTC"),
    timezoneOffsetMinutes: z.number().int().min(-840).max(840).default(0),
});

export const notificationSettingsPatchSchema = notificationSettingsSchema.partial();

export type NudgeInput = z.infer<typeof nudgeSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type NotificationSettingsPatchInput = z.infer<typeof notificationSettingsPatchSchema>;
