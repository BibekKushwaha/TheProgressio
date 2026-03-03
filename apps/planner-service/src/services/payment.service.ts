import Razorpay from 'razorpay';
import crypto from 'crypto';
import { BillingPlan, BillingStatus, prisma } from '@repo/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentProvider = 'UPI' | 'NET_BANKING' | 'CARD' | 'WALLET';
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface CreatePaymentIntentInput {
  plan: BillingPlan;
  provider: PaymentProvider;
  /** Set when creating a renewal or retry order — links back to original event */
  parentRef?: string;
  /** 0 = normal, 1/2/3 = retry attempts */
  retryCount?: number;
  /** Override the default cycle days (e.g. prorated shorter cycle) */
  cycleDays?: number;
  /** Override price in paise (for prorated upgrades) */
  overrideAmountPaise?: number;
  eventType?: 'PAYMENT' | 'RENEWAL' | 'REFUND' | 'UPGRADE';
  /** Client IP — stored in payload for cross-account fraud detection */
  ip?: string;
  /** Skip fraud checks (used for internal renewal/retry jobs) */
  skipFraudCheck?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_PLAN_PRICE_PAISE: Record<BillingPlan, number> = {
  FREE: 0,
  PRO: 14900,         // ₹ 149
  INSTITUTION: 99900, // ₹ 999
};

/** Subscription cycle length in days */
export const PLAN_CYCLE_DAYS: Record<BillingPlan, number> = {
  FREE: 0,
  PRO: 30,
  INSTITUTION: 365,
};

/** How many days past renewalAt the user still has full access */
export const GRACE_PERIOD_DAYS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const randomToken = (prefix: string): string => {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${stamp}_${rand}`;
};

export const toJsonString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// ---------------------------------------------------------------------------
// Grace period / access check
// ---------------------------------------------------------------------------

/**
 * Returns true if the user should have access to premium features right now.
 * Accounts for a 3-day grace period past renewalAt so a failed renewal doesn't
 * immediately cut off access.
 */
export function isSubscriptionActive(user: {
  plan: BillingPlan;
  planStatus: BillingStatus | string;
  renewalAt?: Date | null;
}): boolean {
  if (user.plan === BillingPlan.FREE) return false;
  if (
    user.planStatus !== BillingStatus.ACTIVE &&
    user.planStatus !== BillingStatus.PAST_DUE
  ) return false;

  // ACTIVE with no renewalAt — treat as indefinitely active (shouldn't happen)
  if (!user.renewalAt) return user.planStatus === BillingStatus.ACTIVE;

  const graceEnd = addDays(new Date(user.renewalAt), GRACE_PERIOD_DAYS);
  return graceEnd >= new Date();
}

// ---------------------------------------------------------------------------
// Razorpay singleton — KEY_SECRET is never logged or returned to clients
// ---------------------------------------------------------------------------

let _razorpay: InstanceType<typeof Razorpay> | null = null;

export function getRazorpay(): InstanceType<typeof Razorpay> {
  if (_razorpay) return _razorpay;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
  }
  _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _razorpay;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

export const normalizePlan = (value: unknown): BillingPlan | null => {
  if (typeof value !== 'string') return null;
  const v = value.trim().toUpperCase();
  if (v === BillingPlan.PRO) return BillingPlan.PRO;
  if (v === BillingPlan.INSTITUTION) return BillingPlan.INSTITUTION;
  if (v === BillingPlan.FREE) return BillingPlan.FREE;
  return null;
};

export const normalizeProvider = (value: unknown): PaymentProvider | null => {
  if (typeof value !== 'string') return null;
  const v = value.trim().toUpperCase();
  if (v === 'UPI') return 'UPI';
  if (v === 'NET_BANKING') return 'NET_BANKING';
  if (v === 'CARD') return 'CARD';
  if (v === 'WALLET') return 'WALLET';
  return null;
};

// ---------------------------------------------------------------------------
// Proration
// ---------------------------------------------------------------------------

/**
 * Computes how much to charge when upgrading from one plan to another
 * mid-cycle. Returns 0 if no existing subscription or already on higher plan.
 *
 * Formula:
 *   remainingDays / cycleDays * (newPlanPrice - currentPlanPrice)
 *   … floored to whole paise, minimum 100 paise (₹1)
 */
export function getProratedUpgradeAmount(
  currentPlan: BillingPlan,
  targetPlan: BillingPlan,
  renewalAt: Date | null | undefined,
): number {
  if (!renewalAt) return DEFAULT_PLAN_PRICE_PAISE[targetPlan];

  const currentPrice = DEFAULT_PLAN_PRICE_PAISE[currentPlan];
  const targetPrice  = DEFAULT_PLAN_PRICE_PAISE[targetPlan];
  if (targetPrice <= currentPrice) return 0; // downgrade or same — no charge

  const now = new Date();
  const totalDays = PLAN_CYCLE_DAYS[currentPlan] || 30;
  const msRemaining = new Date(renewalAt).getTime() - now.getTime();
  const daysRemaining = Math.max(0, msRemaining / (1000 * 60 * 60 * 24));
  const fraction = Math.min(1, daysRemaining / totalDays);
  const proratedDiff = Math.floor((targetPrice - currentPrice) * fraction);
  return Math.max(100, proratedDiff); // minimum ₹1
}

// ---------------------------------------------------------------------------
// Step 1 — Create Razorpay Order (server-side price ONLY, client can't override)
// ---------------------------------------------------------------------------

export async function createPaymentIntent(userId: string, input: CreatePaymentIntentInput) {
  if (input.plan === BillingPlan.FREE) {
    throw new Error('FREE plan does not require payment');
  }

  // ── Duplicate in-flight payment detection ───────────────────────────────
  // If there's already a CREATED/PENDING order for the same user+plan within
  // the last 10 minutes, return it instead of creating a new one.  This prevents
  // double-charges from double-taps or page refreshes.
  if (!input.parentRef && input.eventType !== 'RENEWAL') {
    const windowMs = 10 * 60 * 1000;
    const since    = new Date(Date.now() - windowMs);
    const existing = await prisma.paymentEvent.findFirst({
      where: {
        userId,
        plan:      input.plan,
        status:    { in: ['CREATED', 'PENDING'] },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      // Re-use the existing order — prevents duplicate charges
      return {
        intentId:    existing.intentId,
        orderId:     existing.paymentRef,
        keyId:       process.env.RAZORPAY_KEY_ID!,
        plan:        existing.plan,
        provider:    existing.provider,
        amountPaise: existing.amountPaise,
        currency:    'INR' as const,
        status:      existing.status,
        eventType:   existing.eventType,
        cycleDays:   input.cycleDays ?? PLAN_CYCLE_DAYS[existing.plan],
        duplicate:   true,
      };
    }
  }

  // Amount is always derived server-side — never from the client
  const amountPaise = input.overrideAmountPaise ?? DEFAULT_PLAN_PRICE_PAISE[input.plan];
  if (amountPaise < 100) throw new Error('Amount too small (minimum ₹1)');

  const intentId    = randomToken('intent');
  const eventType   = input.eventType ?? 'PAYMENT';
  const cycleDays   = input.cycleDays ?? PLAN_CYCLE_DAYS[input.plan];

  // ── Fraud pre-check (skip for system-generated renewals) ──────────────
  if (!input.skipFraudCheck) {
    const { runFraudChecks } = await import('./fraud.service.js');
    const fraudResult = await runFraudChecks({
      userId,
      plan:        input.plan,
      amountPaise,
      ...(input.ip ? { ip: input.ip } : {}),
    });
    if (fraudResult.blocked) {
      throw new Error(`payment_blocked_fraud:${fraudResult.reason ?? fraudResult.risk}`);
    }
  }

  const rzp = getRazorpay();
  const order = await (rzp.orders as any).create({
    amount:   amountPaise,
    currency: 'INR',
    receipt:  intentId,
    notes: {
      userId,
      plan:       input.plan,
      provider:   input.provider,
      eventType,
      retryCount: String(input.retryCount ?? 0),
    },
  });

  const event = await prisma.paymentEvent.create({
    data: {
      userId,
      intentId,
      paymentRef: order.id,
      provider:   input.provider,
      plan:       input.plan,
      amountPaise,
      status:     'CREATED',
      eventType,
      retryCount: input.retryCount ?? 0,
      parentRef:  input.parentRef ?? null,
      payload:    toJsonString({
        razorpayOrderId: order.id,
        source: eventType.toLowerCase(),
        cycleDays,
        ...(input.ip ? { ip: input.ip } : {}),
      }),
    },
  });

  return {
    intentId:    event.intentId,
    orderId:     order.id,
    // KEY_ID is public — safe to expose. KEY_SECRET must never appear here.
    keyId:       process.env.RAZORPAY_KEY_ID!,
    plan:        event.plan,
    provider:    event.provider,
    amountPaise: event.amountPaise,
    currency:    'INR' as const,
    status:      event.status,
    eventType,
    cycleDays,
  };
}

// ---------------------------------------------------------------------------
// Step 4 — Verify Razorpay Signature + validate payment + Activate User
// ---------------------------------------------------------------------------

export async function verifyRazorpayPayment(input: {
  razorpayOrderId:   string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error('RAZORPAY_KEY_SECRET not set');

  // ── 1. HMAC validation (fast, CPU-only, done first) ─────────────────────
  const expectedSig = crypto
    .createHmac('sha256', keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest('hex');

  let sigBuf: Buffer;
  try { sigBuf = Buffer.from(input.razorpaySignature, 'hex'); }
  catch { return { verified: false as const, reason: 'malformed_signature' as const }; }

  const expBuf   = Buffer.from(expectedSig, 'hex');
  const sigValid = expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);
  if (!sigValid) return { verified: false as const, reason: 'invalid_signature' as const };

  // ── 2. Load stored PaymentEvent to know the expected amount ──────────────
  const existing = await prisma.paymentEvent.findUnique({
    where: { paymentRef: input.razorpayOrderId },
  });
  if (!existing) return { verified: false as const, reason: 'order_not_found' as const };

  // ── 3. Idempotency — already processed, don't double-activate ───────────
  if (existing.status === 'SUCCESS') {
    return { verified: true as const, idempotent: true, orderId: existing.paymentRef, plan: existing.plan };
  }

  // ── 4. Fetch payment from Razorpay API — validate amount/currency/status ─
  const rzp = getRazorpay();
  let rzpPayment: Record<string, unknown>;
  try {
    rzpPayment = await (rzp.payments as any).fetch(input.razorpayPaymentId) as Record<string, unknown>;
  } catch {
    return { verified: false as const, reason: 'payment_fetch_failed' as const };
  }

  // 4a. Status must be 'captured' (money actually received)
  if (rzpPayment['status'] !== 'captured') {
    return { verified: false as const, reason: `payment_not_captured:${rzpPayment['status']}` as const };
  }

  // 4b. Order ID must match what the client claims
  if (rzpPayment['order_id'] !== input.razorpayOrderId) {
    return { verified: false as const, reason: 'order_id_mismatch' as const };
  }

  // 4c. Currency must be INR
  if (rzpPayment['currency'] !== 'INR') {
    return { verified: false as const, reason: 'invalid_currency' as const };
  }

  // 4d. Amount must EXACTLY match stored server-side amount (prevents client manipulation)
  const paidAmount = Number(rzpPayment['amount']);
  if (paidAmount !== existing.amountPaise) {
    return {
      verified: false as const,
      reason: `amount_mismatch:expected_${existing.amountPaise}_got_${paidAmount}` as const,
    };
  }

  // ── 5. Activate user in DB transaction ───────────────────────────────────
  const cycleDays = (() => {
    try {
      const p = JSON.parse(existing.payload ?? '{}');
      return typeof p.cycleDays === 'number' ? p.cycleDays : PLAN_CYCLE_DAYS[existing.plan];
    } catch {
      return PLAN_CYCLE_DAYS[existing.plan];
    }
  })();

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.paymentEvent.update({
      where: { paymentRef: input.razorpayOrderId },
      data: {
        status: 'SUCCESS',
        payload: toJsonString({
          razorpayOrderId:   input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
          paidAmount,
          validatedAt: new Date().toISOString(),
        }),
      },
    });

    await tx.user.update({
      where: { id: existing.userId },
      data: {
        plan:            existing.plan,
        planStatus:      BillingStatus.ACTIVE,
        paymentProvider: 'RAZORPAY',
        paymentRef:      input.razorpayPaymentId,
        renewalAt:       addDays(new Date(), cycleDays),
      },
    });

    return updated;
  });

  return {
    verified:   true as const,
    idempotent: false,
    orderId:    result.paymentRef,
    plan:       existing.plan,
    cycleDays,
  };
}

// ---------------------------------------------------------------------------
// Step 5 — Razorpay Webhook (backup server-to-server)
// ---------------------------------------------------------------------------

/** Write a failed or unprocessable webhook to the dead-letter queue in DB */
async function writeToDlq(
  rawBody: string,
  signature: string | null,
  event: string,
  reason: string,
): Promise<void> {
  try {
    await prisma.webhookDLQ.create({
      data: {
        event,
        rawBody,
        ...(signature ? { signature } : {}),
        reason,
        retryCount: 0,
        nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
  } catch (dlqErr) {
    // DLQ write failed — log to console as last resort
    console.error('[webhook-dlq] CRITICAL: failed to write DLQ entry:', reason, dlqErr);
  }
}

export async function applyRazorpayWebhook(rawBody: string, signature: string | null) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return { authorized: false as const, reason: 'webhook_secret_not_configured' as const };
  if (!signature)     return { authorized: false as const, reason: 'missing_x_razorpay_signature' as const };

  const expectedSig = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  let sigBuf: Buffer;
  try { sigBuf = Buffer.from(signature, 'hex'); }
  catch { return { authorized: false as const, reason: 'malformed_signature' as const }; }

  const expBuf  = Buffer.from(expectedSig, 'hex');
  const isValid = expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);
  if (!isValid) return { authorized: false as const, reason: 'invalid_signature' as const };

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(rawBody) as Record<string, unknown>; }
  catch {
    await writeToDlq(rawBody, signature, 'unknown', 'invalid_json');
    return { authorized: true as const, processed: false as const, reason: 'invalid_json' };
  }

  const event = parsed['event'] as string | undefined;

  try {

  // ── payment.captured ────────────────────────────────────────────────────
  if (event === 'payment.captured' || event === 'payment.authorized') {
    const paymentEntity = ((parsed['payload'] as any)?.payment?.entity ?? {}) as Record<string, unknown>;
    const orderId   = paymentEntity['order_id'] as string | undefined;
    const paymentId = paymentEntity['id']       as string | undefined;
    const amount    = Number(paymentEntity['amount'] ?? 0);

    if (!orderId) return { authorized: true as const, processed: false as const, reason: 'missing_order_id' };

    const existing = await prisma.paymentEvent.findUnique({ where: { paymentRef: orderId } });
    if (!existing)                return { authorized: true as const, processed: false as const, reason: 'order_not_found' };
    if (existing.status === 'SUCCESS') return { authorized: true as const, processed: true as const, idempotent: true, event };

    // Validate amount integrity from webhook payload
    if (amount > 0 && amount !== existing.amountPaise) {
      return { authorized: true as const, processed: false as const, reason: `amount_mismatch:${amount}vs${existing.amountPaise}` };
    }

    const cycleDays = (() => {
      try {
        const p = JSON.parse(existing.payload ?? '{}');
        return typeof p.cycleDays === 'number' ? p.cycleDays : PLAN_CYCLE_DAYS[existing.plan];
      } catch { return PLAN_CYCLE_DAYS[existing.plan]; }
    })();

    await prisma.$transaction(async (tx) => {
      await tx.paymentEvent.update({
        where: { paymentRef: orderId },
        data:  { status: 'SUCCESS', payload: toJsonString(paymentEntity) },
      });
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          plan:            existing.plan,
          planStatus:      BillingStatus.ACTIVE,
          paymentProvider: 'RAZORPAY',
          paymentRef:      paymentId ?? orderId,
          renewalAt:       addDays(new Date(), cycleDays),
        },
      });
    });

    return { authorized: true as const, processed: true as const, idempotent: false, event };
  }

  // ── payment.failed ────────────────────────────────────────────────────────
  if (event === 'payment.failed') {
    const paymentEntity = ((parsed['payload'] as any)?.payment?.entity ?? {}) as Record<string, unknown>;
    const orderId = paymentEntity['order_id'] as string | undefined;

    if (orderId) {
      const existing = await prisma.paymentEvent.findUnique({ where: { paymentRef: orderId } });
      if (existing && existing.status !== 'SUCCESS') {
        await prisma.$transaction(async (tx) => {
          await tx.paymentEvent.update({
            where: { paymentRef: orderId },
            data:  { status: 'FAILED', payload: toJsonString(paymentEntity) },
          });
          await tx.user.update({
            where: { id: existing.userId },
            data:  { planStatus: BillingStatus.PAST_DUE },
          });
        });
        // Enqueue retry job — imported lazily to avoid circular dep
        await schedulePaymentRetry(existing.userId, orderId, existing.retryCount).catch(() => null);
      }
    }
    return { authorized: true as const, processed: true as const, event };
  }

  // ── refund.processed ─────────────────────────────────────────────────────
  if (event === 'refund.processed' || event === 'refund.created') {
    const refundEntity  = ((parsed['payload'] as any)?.refund?.entity ?? {}) as Record<string, unknown>;
    const refundId      = refundEntity['id']         as string | undefined;
    const notes         = refundEntity['notes'] as Record<string, unknown> | null | undefined;
    const orderId       = (notes?.['order_id'] as string | undefined) ?? '';
    const refundAmount  = Number(refundEntity['amount'] ?? 0);

    if (refundId && orderId) {
      await prisma.paymentEvent.updateMany({
        where: { paymentRef: orderId, status: 'SUCCESS' },
        data: {
          status:            'REFUNDED',
          refundId,
          refundedAt:        new Date(),
          refundAmountPaise: refundAmount || null,
          payload:           toJsonString(refundEntity),
        },
      });
    }
    return { authorized: true as const, processed: true as const, event };
  }

    return { authorized: true as const, processed: false as const, event: event ?? 'unknown' };

  } catch (err: unknown) {
    // Unexpected processing error — write to dead-letter queue for manual review / retry
    const msg = err instanceof Error ? err.message : String(err);
    await writeToDlq(rawBody, signature, event ?? 'unknown', `processing_error:${msg}`);
    return { authorized: true as const, processed: false as const, reason: `dlq_enqueued:${msg}` };
  }
}

// ---------------------------------------------------------------------------
// Refund
// ---------------------------------------------------------------------------

/**
 * Issues a Razorpay refund for a captured payment.
 * amount omitted = full refund.
 */
export async function createRefund(userId: string, paymentRef: string, amountPaise?: number) {
  const event = await prisma.paymentEvent.findFirst({
    where: { paymentRef, userId, status: 'SUCCESS' },
  });
  if (!event) return { refunded: false as const, reason: 'payment_not_found_or_not_captured' };
  if (event.refundId)
    return { refunded: false as const, reason: 'already_refunded', refundId: event.refundId };

  // The paymentRef stored on the User is the Razorpay payment ID (pay_xxx), not order ID.
  // Fetch the user's paymentRef to get the actual pay_ ID for this event.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paymentRef: true },
  });
  // Fallback: try to parse from the event payload
  let razorpayPaymentId: string | null = user?.paymentRef ?? null;
  try {
    const p = JSON.parse(event.payload ?? '{}');
    if (typeof p.razorpayPaymentId === 'string') razorpayPaymentId = p.razorpayPaymentId;
  } catch { /* ignore */ }

  if (!razorpayPaymentId) return { refunded: false as const, reason: 'razorpay_payment_id_not_found' };

  const rzp = getRazorpay();
  const refundParams: Record<string, unknown> = {
    notes: { order_id: paymentRef, userId },
  };
  if (amountPaise && amountPaise < event.amountPaise) {
    refundParams['amount'] = amountPaise; // partial refund
  }

  let rzpRefund: Record<string, unknown>;
  try {
    rzpRefund = await (rzp.payments as any).refund(razorpayPaymentId, refundParams) as Record<string, unknown>;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { refunded: false as const, reason: `razorpay_error:${msg}` };
  }

  const refundId     = rzpRefund['id'] as string;
  const refundAmount = Number(rzpRefund['amount'] ?? amountPaise ?? event.amountPaise);
  const isFullRefund = refundAmount >= event.amountPaise;

  await prisma.$transaction(async (tx) => {
    await tx.paymentEvent.update({
      where: { id: event.id },
      data: {
        status:            'REFUNDED',
        refundId,
        refundedAt:        new Date(),
        refundAmountPaise: refundAmount,
        payload:           toJsonString({ ...JSON.parse(event.payload ?? '{}'), refund: rzpRefund }),
      },
    });

    // Full refund → downgrade user immediately
    if (isFullRefund) {
      await tx.user.update({
        where: { id: userId },
        data: {
          plan:            BillingPlan.FREE,
          planStatus:      BillingStatus.CANCELED,
          renewalAt:       null,
          paymentProvider: null,
          paymentRef:      null,
        },
      });
    }
  });

  return { refunded: true as const, refundId, refundAmount, isFullRefund };
}

// ---------------------------------------------------------------------------
// Retry failed payment
// ---------------------------------------------------------------------------

const RETRY_SCHEDULE_DAYS = [1, 3, 7]; // retry at day 1, day 3, day 7 after failure
const MAX_RETRIES = RETRY_SCHEDULE_DAYS.length;

/**
 * Schedules the next retry attempt for a failed payment using a BullMQ job.
 * The job is a delayed job that matures after the next retry window.
 * If all retries are exhausted, user stays on PAST_DUE.
 */
export async function schedulePaymentRetry(
  userId: string,
  failedPaymentRef: string,
  currentRetryCount: number,
): Promise<void> {
  const nextRetry = currentRetryCount + 1;
  if (nextRetry > MAX_RETRIES) return; // exhausted

  const delayDays   = RETRY_SCHEDULE_DAYS[currentRetryCount] ?? RETRY_SCHEDULE_DAYS[MAX_RETRIES - 1]!;
  const delayMs   = delayDays * 24 * 60 * 60 * 1000;

  try {
    const { paymentRetryQueue } = await import('./renewal.service.js');
    await paymentRetryQueue.add(
      'retry',
      { userId, failedPaymentRef, retryCount: nextRetry },
      { delay: delayMs, attempts: 1, removeOnComplete: true, removeOnFail: true },
    );
  } catch { /* BullMQ unavailable — log and continue, webhook is still backup */ }
}

// ---------------------------------------------------------------------------
// Billing profile
// ---------------------------------------------------------------------------

export async function getUserBillingProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:              true,
      plan:            true,
      planStatus:      true,
      renewalAt:       true,
      paymentProvider: true,
      paymentRef:      true,
    },
  });
  if (!user) return null;

  return {
    ...user,
    isAccessActive: isSubscriptionActive(user),
    graceUntil: user.renewalAt ? addDays(new Date(user.renewalAt), GRACE_PERIOD_DAYS) : null,
  };
}
