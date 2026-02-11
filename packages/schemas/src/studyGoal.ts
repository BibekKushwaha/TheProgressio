import { z } from "zod";

export const studyGoalSchema = z.object({
    title: z.string().min(1, "Goal title is required").max(200),
    targetDate: z.coerce.date().optional(),
    isAchieved: z.boolean().default(false),
    subjectId: z.string().uuid().optional(),
});

export type StudyGoalInput = z.infer<typeof studyGoalSchema>;
