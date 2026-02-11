import { z } from "zod";

export const rotationPatternSchema = z.object({
    name: z.string().min(1, "Pattern name is required").max(100),
    pattern: z.array(z.string().min(1)).min(1, "At least one rotation label is required"),
    startDate: z.coerce.date(),
    cycleLengthDays: z.number().int().positive().default(7),
    isActive: z.boolean().default(true),
});

export type RotationPatternInput = z.infer<typeof rotationPatternSchema>;
