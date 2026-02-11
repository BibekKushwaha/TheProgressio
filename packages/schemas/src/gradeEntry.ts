import { z } from "zod";

export const gradeEntrySchema = z.object({
    subjectName: z.string().min(1, "Subject name is required").max(200),
    chapter: z.string().max(200).optional(),
    totalMarks: z.number().positive("Total marks must be positive"),
    obtainedMarks: z.number().min(0, "Obtained marks cannot be negative"),
    examType: z.enum(["JEE", "NEET", "UPSC", "INTERNAL", "BOARD"]).default("INTERNAL"),
    timeTakenMins: z.number().int().positive().optional(),
});

export type GradeEntryInput = z.infer<typeof gradeEntrySchema>;
