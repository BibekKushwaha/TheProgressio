import { z } from "zod";

export const billingPlanSchema = z.enum(["FREE", "PRO", "INSTITUTION"]);

export const billingStatusSchema = z.enum([
  "INACTIVE",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
]);

export const userBillingSchema = z.object({
  plan: billingPlanSchema.default("FREE"),
  planStatus: billingStatusSchema.default("INACTIVE"),
  renewalAt: z.coerce.date().optional(),
  paymentProvider: z.string().min(1).max(40).optional(),
  paymentRef: z.string().min(1).max(120).optional(),
});

export type BillingPlan = z.infer<typeof billingPlanSchema>;
export type BillingStatus = z.infer<typeof billingStatusSchema>;
export type UserBillingInput = z.infer<typeof userBillingSchema>;
