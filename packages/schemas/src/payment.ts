import { z } from "zod";
import { billingPlanSchema } from "./billing";

export const paymentProviderSchema = z.enum(["UPI", "PAYTM", "NET_BANKING"]);

export const paymentEventStatusSchema = z.enum([
  "CREATED",
  "PENDING",
  "SUCCESS",
  "FAILED",
]);

export const paymentIntentSchema = z.object({
  plan: billingPlanSchema,
  amountPaise: z.number().int().min(0),
  provider: paymentProviderSchema,
  upiId: z.string().email().optional(),
});

export const paymentWebhookSchema = z.object({
  intentId: z.string().min(1).max(120),
  paymentRef: z.string().min(1).max(120),
  status: paymentEventStatusSchema,
  payload: z.string().optional(),
});

export const paymentEventSchema = z.object({
  intentId: z.string().min(1).max(120),
  paymentRef: z.string().min(1).max(120),
  provider: paymentProviderSchema,
  plan: billingPlanSchema,
  amountPaise: z.number().int().min(0),
  status: paymentEventStatusSchema,
  upiId: z.string().email().optional(),
  payload: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
export type PaymentEventInput = z.infer<typeof paymentEventSchema>;
