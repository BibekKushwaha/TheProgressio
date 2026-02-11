import { z } from "zod";

export const subtaskSchema = z.object({
    title: z.string().min(1, "Subtask title is required").max(200),
    completed: z.boolean().default(false),
    taskId: z.string().uuid("Please select a parent task"),
});

export type SubtaskInput = z.infer<typeof subtaskSchema>;
