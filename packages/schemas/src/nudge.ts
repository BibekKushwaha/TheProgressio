import { z } from "zod";

export const nudgeSchema = z.object({
    type: z.enum(["STREAK_RISK", "EXAM_WARNING", "MORNING_BRIEFING", "SLIP_DETECTION"]),
    title: z.string().min(1, "Nudge title is required").max(200),
    message: z.string().min(1, "Nudge message is required").max(1000),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
    isRead: z.boolean().default(false),
    scheduledAt: z.coerce.date().default(() => new Date()),
    expiresAt: z.coerce.date().optional(),
    metadata: z.string().optional(),
});

export type NudgeInput = z.infer<typeof nudgeSchema>;
