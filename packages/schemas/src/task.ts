import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(100),
  description: z.string().max(1000).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("PENDING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.coerce.date().optional(),
  categoryId: z.string().uuid().optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;
