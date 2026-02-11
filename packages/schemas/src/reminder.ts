import { z } from "zod";

export const reminderSchema = z.object({
    reminderTime: z.coerce.date(),
    isSent: z.boolean().default(false),
    taskId: z.string().uuid().optional(),
    habitId: z.string().uuid().optional(),
});

export type ReminderInput = z.infer<typeof reminderSchema>;
