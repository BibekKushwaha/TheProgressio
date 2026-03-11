import { z } from "zod";
import { EFFORT_OPTIONS, normalizeEffortValue } from "./effort";
export {
  EFFORT_OPTIONS,
  normalizeEffortValue,
  EFFORT_MINUTES,
  effortToMinutes,
  toDbEffortValue,
  fromDbEffortValue,
} from "./effort";
export type { EffortOption } from "./effort";

export const effortSchema = z.preprocess(
  (value) => normalizeEffortValue(value),
  z.enum(EFFORT_OPTIONS)
);

export const taskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(100),
  description: z.string().max(1000).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("PENDING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueDate: z.coerce.date().optional(),
  categoryId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  topicIds: z.array(z.string().uuid()).optional(),
  isRecurring: z.boolean().default(false),
  effort: effortSchema.optional(),
});

export const smartCreateTaskSchema = z.object({
  text: z.string().min(1, "Text input is required"),
  categoryId: z.string().uuid().optional(),
  topicIds: z.array(z.string().uuid()).optional(),
});

export const parseTaskIntentSchema = smartCreateTaskSchema;
export const parseTaskIntentResultSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  subject: z.string().optional(),
  effort: effortSchema.optional(),
  isRecurring: z.boolean().optional(),
  type: z.enum(["ASSIGNMENT", "EXAM", "STUDY_GOAL"]).optional(),
});

export const previewSubtasksSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().max(4000).optional(),
});

export const scanSyllabusImageSchema = z.object({
  imageBase64: z.string().min(1, "imageBase64 is required"),
  mimeType: z.string().min(1).optional(),
});

export const recoveryPlanSchema = z.object({
  anchorDate: z.coerce.date().optional(),
  taskIds: z.array(z.string()).optional(),
  overrides: z.record(z.string(), z.string()).optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;
export type SmartCreateTaskInput = z.infer<typeof smartCreateTaskSchema>;
export type ParseTaskIntentInput = z.infer<typeof parseTaskIntentSchema>;
export type ParseTaskIntentResult = z.infer<typeof parseTaskIntentResultSchema>;
export type PreviewSubtasksInput = z.infer<typeof previewSubtasksSchema>;
export type ScanSyllabusImageInput = z.infer<typeof scanSyllabusImageSchema>;
export type RecoveryPlanInput = z.infer<typeof recoveryPlanSchema>;
