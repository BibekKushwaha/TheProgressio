import { z } from "zod";

export const courseGradeSchema = z.object({
    courseName: z.string().min(1, "Course name is required").max(200),
    credits: z.number().positive("Credits must be positive").default(3),
    gradePoint: z.number().min(0).max(10).optional(),
    grade: z.string().max(5).optional(),
    semester: z.number().int().positive().default(1),
});

export type CourseGradeInput = z.infer<typeof courseGradeSchema>;
