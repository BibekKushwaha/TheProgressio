import { z } from "zod";

export const activityLogSchema = z.object({
  taskId: z.string().uuid("Please select a task to track"),
  sessionType: z.enum(["DEEP_WORK", "POMODORO", "BREAK"]),
  durationMinutes: z.number().int().min(1, "Session too short to log"),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export type ActivityLogInput = z.infer<typeof activityLogSchema>;
