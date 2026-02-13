import { z } from "zod";

export const activityLogSchema = z.object({
  taskId: z.string().uuid("Please select a task to track"),
  sessionType: z.enum(["DEEP_WORK", "POMODORO", "BREAK"]),
  durationMinutes: z.number().int().min(1, "Session too short to log"),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export type ActivityLogInput = z.infer<typeof activityLogSchema>;

export const focusSessionTypeSchema = z.enum(["DEEP_WORK", "POMODORO", "BREAK"]);
export const focusSessionStatusSchema = z.enum(["RUNNING", "PAUSED", "COMPLETED", "CANCELLED"]);

export const startFocusLiveSessionSchema = z.object({
  taskId: z.string().min(1, "taskId is required"),
  taskTitle: z.string().min(1).optional(),
  plannedDurationMinutes: z.number().int().min(1).max(360).default(25),
  sessionType: focusSessionTypeSchema.default("POMODORO"),
  deviceId: z.string().max(120).optional(),
  source: z.string().max(120).optional(),
  recommendedStart: z.string().max(40).optional(),
  recommendedEnd: z.string().max(40).optional(),
});

export const focusLiveSignalSchema = z.object({
  sessionId: z.string().uuid("sessionId must be a valid UUID"),
  deviceId: z.string().max(120).optional(),
});

export const focusLiveHeartbeatSchema = focusLiveSignalSchema.extend({
  remainingSeconds: z.number().int().min(0).optional(),
});

export const stopFocusLiveSessionSchema = focusLiveSignalSchema.extend({
  outcome: z.enum(["COMPLETED", "CANCELLED"]).default("COMPLETED"),
});

export const focusLiveSessionSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string(),
  taskId: z.string(),
  taskTitle: z.string(),
  sessionType: focusSessionTypeSchema,
  status: focusSessionStatusSchema,
  plannedDurationMinutes: z.number().int().min(1).max(360),
  elapsedSeconds: z.number().int().min(0),
  remainingSeconds: z.number().int().min(0),
  startedAt: z.coerce.date(),
  pausedAt: z.coerce.date().optional(),
  resumedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  lastHeartbeatAt: z.coerce.date(),
  deviceId: z.string().optional(),
  source: z.string().optional(),
  recommendedStart: z.string().optional(),
  recommendedEnd: z.string().optional(),
});

export type StartFocusLiveSessionInput = z.infer<typeof startFocusLiveSessionSchema>;
export type FocusLiveSignalInput = z.infer<typeof focusLiveSignalSchema>;
export type FocusLiveHeartbeatInput = z.infer<typeof focusLiveHeartbeatSchema>;
export type StopFocusLiveSessionInput = z.infer<typeof stopFocusLiveSessionSchema>;
export type FocusLiveSession = z.infer<typeof focusLiveSessionSchema>;
