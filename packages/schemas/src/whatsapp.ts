import { z } from "zod";

export const whatsappCaptureSchema = z.object({
  userId: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
  from: z.string().min(1).optional(),
  interactiveReplyId: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  imageCaption: z.string().optional(),
  audioUrl: z.string().url().optional(),
}).passthrough();

export const whatsappTaskReminderSchema = z.object({
  to: z.string().min(1, "to is required"),
  taskId: z.string().min(1, "taskId is required"),
});

export const whatsappTemplateMessageSchema = z.object({
  to: z.string().min(1, "to is required"),
  templateName: z.string().min(1, "templateName is required"),
  languageCode: z.string().min(1).default("en"),
  bodyVariables: z.array(z.string()).optional(),
});

export const whatsappOutcomeNudgeSchema = z.object({
  to: z.string().min(1, "to is required"),
  userId: z.string().min(1, "userId is required"),
  targetPercentile: z.coerce.number().int().min(1).max(100).optional(),
  chapter: z.string().optional(),
});

export type WhatsAppCaptureInput = z.infer<typeof whatsappCaptureSchema>;
export type WhatsAppTaskReminderInput = z.infer<typeof whatsappTaskReminderSchema>;
export type WhatsAppTemplateMessageInput = z.infer<typeof whatsappTemplateMessageSchema>;
export type WhatsAppOutcomeNudgeInput = z.infer<typeof whatsappOutcomeNudgeSchema>;
