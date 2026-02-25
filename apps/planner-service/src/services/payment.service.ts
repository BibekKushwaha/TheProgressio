import { BillingPlan, BillingStatus, prisma } from '@repo/db';

export type PaymentProvider = 'UPI' | 'PAYTM' | 'NET_BANKING' | 'CARD';
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED';

export interface CreatePaymentIntentInput {
  plan: BillingPlan;
  provider: PaymentProvider;
  // amountPaise intentionally removed — amount is always derived server-side from DEFAULT_PLAN_PRICE_PAISE
}

export interface PaymentWebhookInput {
  paymentRef: string;
  status: PaymentStatus;
  provider?: PaymentProvider;
  payload?: unknown;
}

const DEFAULT_PLAN_PRICE_PAISE: Record<BillingPlan, number> = {
  FREE: 0,
  PRO: 14900,
  INSTITUTION: 99900,
};

const randomToken = (prefix: string): string => {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${stamp}_${rand}`;
};

const toJsonString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

export const normalizePlan = (value: unknown): BillingPlan | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === BillingPlan.PRO) return BillingPlan.PRO;
  if (normalized === BillingPlan.INSTITUTION) return BillingPlan.INSTITUTION;
  if (normalized === BillingPlan.FREE) return BillingPlan.FREE;
  return null;
};

export const normalizeProvider = (value: unknown): PaymentProvider | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'UPI') return 'UPI';
  if (normalized === 'PAYTM') return 'PAYTM';
  if (normalized === 'NET_BANKING') return 'NET_BANKING';
  if (normalized === 'CARD') return 'CARD';
  return null;
};

export const normalizePaymentStatus = (value: unknown): PaymentStatus | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'CREATED') return 'CREATED';
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'SUCCESS') return 'SUCCESS';
  if (normalized === 'FAILED') return 'FAILED';
  return null;
};

export async function createPaymentIntent(userId: string, input: CreatePaymentIntentInput) {
  if (input.plan === BillingPlan.FREE) {
    throw new Error('FREE plan does not require payment intent');
  }

  const amountPaise = DEFAULT_PLAN_PRICE_PAISE[input.plan];
  const intentId = randomToken('intent');
  const paymentRef = randomToken('pay');

  const event = await prisma.paymentEvent.create({
    data: {
      userId,
      intentId,
      paymentRef,
      provider: input.provider,
      plan: input.plan,
      amountPaise,
      status: 'CREATED',
      payload: toJsonString({ source: 'pricing-ui' }),
    },
  });

  return {
    intentId: event.intentId,
    paymentRef: event.paymentRef,
    plan: event.plan,
    provider: event.provider,
    amountPaise: event.amountPaise,
    status: event.status,
  };
}

export async function createUpiCollectRequest(userId: string, intentId: string, upiId: string) {
  const record = await prisma.paymentEvent.findFirst({
    where: { intentId, userId },
  });

  if (!record) {
    return null;
  }

  const updated = await prisma.paymentEvent.update({
    where: { intentId },
    data: {
      status: 'PENDING',
      upiId,
      payload: toJsonString({ lastAction: 'upi_collect_requested', upiId }),
    },
  });

  const deepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Academic+Tracker&am=${(updated.amountPaise / 100).toFixed(2)}&tn=${encodeURIComponent(updated.paymentRef)}`;

  return {
    intentId: updated.intentId,
    paymentRef: updated.paymentRef,
    status: updated.status,
    upiId: updated.upiId,
    deepLink,
  };
}

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export async function applyPaymentWebhook(input: PaymentWebhookInput) {
  const existing = await prisma.paymentEvent.findUnique({
    where: { paymentRef: input.paymentRef },
  });

  if (!existing) {
    return { processed: false as const, reason: 'payment_ref_not_found' as const };
  }

  if (existing.status === 'SUCCESS' && input.status === 'SUCCESS') {
    return {
      processed: true as const,
      idempotent: true,
      paymentRef: existing.paymentRef,
      status: existing.status,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedEvent = await tx.paymentEvent.update({
      where: { paymentRef: input.paymentRef },
      data: {
        status: input.status,
        provider: input.provider ?? existing.provider,
        payload: toJsonString(input.payload),
      },
    });

    if (input.status === 'SUCCESS') {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          plan: existing.plan,
          planStatus: BillingStatus.ACTIVE,
          paymentProvider: input.provider ?? existing.provider,
          paymentRef: existing.paymentRef,
          renewalAt: addDays(new Date(), 30),
        },
      });
    }

    if (input.status === 'FAILED') {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          planStatus: BillingStatus.PAST_DUE,
        },
      });
    }

    return updatedEvent;
  });

  return {
    processed: true as const,
    idempotent: false,
    paymentRef: result.paymentRef,
    status: result.status,
  };
}

export async function getUserBillingProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      plan: true,
      planStatus: true,
      renewalAt: true,
      paymentProvider: true,
      paymentRef: true,
    },
  });

  if (!user) {
    return null;
  }

  return user;
}
