import { z } from "zod";

export const notificationCategorySchema = z.enum([
  "URGENCY_DRIVEN",
  "MORNING_BRIEFING",
  "BEHAVIORAL_NUDGE",
  "ADVANCE_ALERT_3WEEK",
  "TRANSACTION_SYSTEM",
]);

export const notificationActionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(40),
  actionType: z.enum(["MARK_COMPLETED", "SNOOZE_1_HOUR", "BREAK_IT_DOWN", "OPEN_DEEP_LINK", "CUSTOM"]),
});

export const notificationProgressSchema = z.object({
  current: z.number().int().min(0),
  total: z.number().int().min(1),
  label: z.string().min(1).max(80).optional(),
});

export const notificationRichMediaSchema = z.object({
  type: z.enum(["IMAGE", "GIF", "VIDEO"]),
  url: z.string().url(),
  sizeMb: z.number().positive().max(10),
  platform: z.enum(["ANDROID", "IOS", "WEB"]).default("WEB"),
}).superRefine((value, ctx) => {
  if (value.platform === "IOS" && value.sizeMb > 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "iOS rich media payload must be <= 2 MB",
      path: ["sizeMb"],
    });
  }
  if (value.platform === "ANDROID" && value.sizeMb > 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Android rich media payload must be <= 10 MB",
      path: ["sizeMb"],
    });
  }
});

export const composeNotificationSchema = z.object({
  category: notificationCategorySchema,
  title: z.string().min(25).max(50),
  body: z.string().min(1).max(150),
  emoji: z.string().max(8).optional(),
  imageUrl: z.string().url().optional(),
  richMedia: notificationRichMediaSchema.optional(),
  progress: notificationProgressSchema.optional(),
  actions: z.array(notificationActionSchema).max(3).optional(),
  deepLink: z.string().min(1).max(200),
  directReplyEnabled: z.boolean().default(false),
  whatsappFallback: z.boolean().default(false),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  taskId: z.string().uuid().optional(),
  examId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const notificationDirectReplySchema = z.object({
  taskId: z.string().uuid().optional(),
  nudgeId: z.string().uuid().optional(),
  text: z.string().min(1).max(240),
}).refine((value) => Boolean(value.taskId || value.nudgeId), {
  message: "Either taskId or nudgeId is required",
  path: ["taskId"],
});

export const revisionDripCampaignSchema = z.object({
  examTitle: z.string().min(2).max(120),
  examDate: z.coerce.date(),
  chapter: z.string().min(2).max(120).optional(),
  deepLinkBase: z.string().min(1).max(200).default("/exam-warroom"),
});

export const geofencePingSchema = z.object({
  placeType: z.enum(["LIBRARY", "CAMPUS", "HOME", "COACHING_CENTER"]),
  plannedTaskId: z.string().uuid().optional(),
  brightness: z.number().min(0).max(1).optional(),
  motionState: z.enum(["STATIONARY", "WALKING", "IN_TRANSIT"]).optional(),
});

export type ComposeNotificationInput = z.infer<typeof composeNotificationSchema>;
export type NotificationDirectReplyInput = z.infer<typeof notificationDirectReplySchema>;
export type RevisionDripCampaignInput = z.infer<typeof revisionDripCampaignSchema>;
export type GeofencePingInput = z.infer<typeof geofencePingSchema>;
