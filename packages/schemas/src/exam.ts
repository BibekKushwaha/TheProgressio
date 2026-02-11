import { z } from "zod";

export const examSchema = z.object({
    title: z.string().min(1, "Exam title is required").max(200),
    date: z.coerce.date(),
    durationMinutes: z.number().int().positive("Duration must be positive"),
    location: z.string().max(200).optional(),
    topics: z.string().max(2000).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("HIGH"),
    subjectId: z.string().uuid("Please select a subject"),
});

export type ExamInput = z.infer<typeof examSchema>;
