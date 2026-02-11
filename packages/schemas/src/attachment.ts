import { z } from "zod";

export const attachmentSchema = z.object({
    name: z.string().min(1, "Attachment name is required").max(200),
    url: z.string().url("Must be a valid URL"),
    size: z.string().optional(),
    taskId: z.string().uuid("Please select a task"),
});

export type AttachmentInput = z.infer<typeof attachmentSchema>;
