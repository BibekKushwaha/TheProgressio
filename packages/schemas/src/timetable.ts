import { z } from "zod";

export const timetableSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6, "Day must be 0 (Sun) to 6 (Sat)"),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
    subjectId: z.string().uuid("Please select a subject"),
    rotation: z.string().max(10).optional(),
});

export type TimetableInput = z.infer<typeof timetableSchema>;
