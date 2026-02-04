import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  colorCode: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
