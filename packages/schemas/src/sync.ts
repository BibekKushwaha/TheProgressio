import { z } from "zod";

export const syncEntityTypeSchema = z.enum(["task", "category"]);
export const syncActionSchema = z.enum(["UPSERT", "DELETE"]);

export const syncOperationSchema = z.object({
  clientId: z.string().min(1).max(120),
  opId: z.string().min(1).max(120),
  entityType: syncEntityTypeSchema,
  entityId: z.string().uuid(),
  action: syncActionSchema,
  payload: z.string().optional(),
  lamportTs: z.number().int().min(0),
  vectorClock: z.string().optional(),
  tombstone: z.boolean().default(false),
});

export const syncBatchSchema = z.object({
  operations: z.array(syncOperationSchema).min(1),
});

export type SyncEntityType = z.infer<typeof syncEntityTypeSchema>;
export type SyncAction = z.infer<typeof syncActionSchema>;
export type SyncOperationInput = z.infer<typeof syncOperationSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
