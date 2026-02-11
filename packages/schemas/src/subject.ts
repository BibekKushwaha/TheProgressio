import { z } from "zod";

export const subjectSchema = z.object({
    name: z.string().min(1, "Subject name is required").max(100),
    code: z.string().max(20).optional(),
    teacher: z.string().max(100).optional(),
    room: z.string().max(50).optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color").default("#3B82F6"),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
