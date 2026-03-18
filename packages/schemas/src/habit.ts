import { z } from "zod";

export const habitSchema = z.object({
  name: z.string().min(1, "Habit name is required").max(50),
  frequency: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  // How many times per day/week (e.g., "Drink 8 glasses of water")
  targetValue: z.number().int().positive().default(1),
  // Category linking to the Planner Service
  categoryId: z.string().uuid().optional(),
  // Customization
  icon: z.string().optional(),
  color: z.string().optional(),
  // Gentle Streak: how many skips before streak breaks
  mercyDaysAllowed: z.number().int().min(0).default(1),
  // For notifications
  reminderTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
    .nullable()
    .optional(),
  scheduleHint: z.enum(["morning", "afternoon", "evening", "night"]).nullable().optional(),
});

// New schema for logging a completion (The "Check-in")
export const habitLogSchema = z.object({
  habitId: z.string().uuid(),
  completedValue: z.number().int().positive().default(1),
  // Allow logging for past dates (optional)
  loggedAt: z.coerce.date().default(() => new Date()),
});

export type HabitInput = z.infer<typeof habitSchema>;
export type HabitLogInput = z.infer<typeof habitLogSchema>;
