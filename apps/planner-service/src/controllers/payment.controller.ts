import type { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '@repo/db';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  applyPaymentWebhook,
  createPaymentIntent,
  createUpiCollectRequest,
  getUserBillingProfile,
  normalizePaymentStatus,
  normalizePlan,
  normalizeProvider,
} from '../services/payment.service.js';
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

/**
 * Verify a webhook signature using timing-safe comparison.
 * Intentionally fails CLOSED — if the environment variable is not set,
 * the request is rejected to avoid accepting unsigned events by default.
 */
const isWebhookAuthorized = (signature: string | null): boolean => {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!expected) return false; // fail closed: reject when secret not configured
  if (!signature) return false;
  try {
    const expBuf = Buffer.from(expected, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
};

const LEGACY_PLAN_PRICES: Record<string, number> = {
  PRO: 14900,
  INSTITUTION: 99900,
};

export const createOrderHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const plan = typeof req.body?.plan === 'string' ? req.body.plan.toUpperCase() : '';
  const amountPaise = LEGACY_PLAN_PRICES[plan];
  if (!amountPaise) {
    throw new ErrorHandler(400, 'Invalid plan');
  }

  const paymentRecord = await (prisma as any).payment.create({
    data: {
      userId,
      amountPaise,
      currency: 'INR',
      status: 'CREATED',
      method: typeof req.body?.method === 'string' ? req.body.method : null,
      razorpayOrderId: `order_mock_${Date.now()}`,
    },
  });

  return res.status(201).json(paymentRecord);
});

export const verifyPaymentHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const razorpayOrderId  = typeof req.body?.razorpayOrderId  === 'string' ? req.body.razorpayOrderId  : '';
  const razorpayPaymentId = typeof req.body?.razorpayPaymentId === 'string' ? req.body.razorpayPaymentId : '';
  const razorpaySignature = typeof req.body?.razorpaySignature === 'string' ? req.body.razorpaySignature : '';
  const plan = typeof req.body?.plan === 'string' ? req.body.plan : 'PRO';

  // Verify Razorpay HMAC signature before touching the DB.
  // Spec: HMAC-SHA256( razorpayOrderId + "|" + razorpayPaymentId, KEY_SECRET )
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new ErrorHandler(500, 'Payment verification is not configured');
  }
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ErrorHandler(400, 'razorpayOrderId, razorpayPaymentId and razorpaySignature are required');
  }
  const expectedSig = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  const sigBuf = Buffer.from(razorpaySignature, 'hex');
  const expBuf = Buffer.from(expectedSig, 'hex');
  const sigValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);
  if (!sigValid) {
    throw new ErrorHandler(400, 'Invalid payment signature');
  }

  const existingPayment = await (prisma as any).payment.findUnique({
    where: { razorpayOrderId },
  });

  if (!existingPayment) {
    throw new ErrorHandler(404, 'Payment not found');
  }

  const transactionResult = await (prisma as any).$transaction([
    (prisma as any).subscription.create({
      data: {
        userId,
        plan,
        status: 'ACTIVE',
        amountPaise: LEGACY_PLAN_PRICES[plan] ?? existingPayment.amountPaise ?? 0,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
    (prisma as any).payment.update({
      where: { razorpayOrderId },
      data: {
        status: 'CAPTURED',
        razorpayPaymentId: razorpayPaymentId || null,
        razorpaySignature: razorpaySignature || null,
      },
    }),
  ]);

  const subscription = transactionResult?.[0];

  return res.status(200).json({
    verified: true,
    subscriptionId: subscription?.id,
    plan: subscription?.plan ?? plan,
    status: subscription?.status ?? 'ACTIVE',
  });
});

export const paymentStatusHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const subscription = await (prisma as any).subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'PAST_DUE'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    return res.status(200).json({
      hasActiveSubscription: false,
      plan: 'FREE',
    });
  }

  return res.status(200).json({
    hasActiveSubscription: true,
    plan: subscription.plan,
    status: subscription.status,
    amountPaise: subscription.amountPaise ?? LEGACY_PLAN_PRICES[subscription.plan] ?? 0,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
});

export const cancelSubscriptionHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const subscription = await (prisma as any).subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'PAST_DUE'] },
    },
  });

  if (!subscription) {
    throw new ErrorHandler(404, 'No active subscription');
  }

  await (prisma as any).subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  });

  return res.status(200).json({ cancelled: true });
});

export const paymentHistoryHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const payments = await (prisma as any).payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({ payments });
});

export const createPaymentIntentHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const plan = normalizePlan(req.body?.plan);
  const provider = normalizeProvider(req.body?.provider);

  if (!plan || !provider || plan === 'FREE') {
    throw new ErrorHandler(400, 'Valid paid plan and provider are required');
  }

  // Idempotency: if the client sends the same Idempotency-Key, return the cached response
  const idempotencyKey = typeof req.headers['idempotency-key'] === 'string'
    ? req.headers['idempotency-key'].trim()
    : null;

  if (idempotencyKey) {
    try {
      const mod = (await import('@repo/cache').catch(() => null)) as any;
      if (mod?.getCache) {
        const cached = await mod.getCache(`idem:pi:${userId}:${idempotencyKey}`);
        if (cached) {
          return res.status(200).json({ message: 'Payment intent created', intent: cached, idempotent: true });
        }
      }
    } catch { /* non-blocking */ }
  }

  const intent = await createPaymentIntent(userId, { plan, provider });

  if (idempotencyKey) {
    try {
      const mod = (await import('@repo/cache').catch(() => null)) as any;
      if (mod?.setCache) {
        await mod.setCache(`idem:pi:${userId}:${idempotencyKey}`, intent, { ex: 86400 }).catch(() => null);
      }
    } catch { /* non-blocking */ }
  }

  return res.status(201).json({ message: 'Payment intent created', intent });
});

export const createUpiCollectHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const intentId = typeof req.body?.intentId === 'string' ? req.body.intentId.trim() : '';
  const upiId = typeof req.body?.upiId === 'string' ? req.body.upiId.trim() : '';

  if (!intentId || !upiId) {
    throw new ErrorHandler(400, 'intentId and upiId are required');
  }

  const collect = await createUpiCollectRequest(userId, intentId, upiId);
  if (!collect) {
    throw new ErrorHandler(404, 'Payment intent not found');
  }

  return res.status(200).json({ message: 'UPI collect request created', collect });
});

export const paymentWebhookHandler = TryCatch(async (req: Request, res: Response) => {
  // Legacy unauthenticated path has been removed — all webhook events must carry
  // a valid X-Payment-Signature header verified below.

  const signatureHeader = req.headers['x-payment-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] ?? null : signatureHeader ?? null;

  if (!isWebhookAuthorized(signature)) {
    throw new ErrorHandler(401, 'Unauthorized webhook');
  }

  const paymentRef = typeof req.body?.paymentRef === 'string' ? req.body.paymentRef.trim() : '';
  const status = normalizePaymentStatus(req.body?.status);
  const provider = normalizeProvider(req.body?.provider);

  if (!paymentRef || !status) {
    throw new ErrorHandler(400, 'paymentRef and valid status are required');
  }

  const result = await applyPaymentWebhook({
    paymentRef,
    status,
    ...(provider ? { provider } : {}),
    payload: req.body,
  });

  if (!result.processed) {
    throw new ErrorHandler(404, 'Payment reference not found');
  }

  return res.status(200).json({ message: 'Webhook processed', result });
});

export const getBillingProfileHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const profile = await getUserBillingProfile(userId);
  if (!profile) {
    throw new ErrorHandler(404, 'User not found');
  }

  return res.status(200).json({ message: 'Billing profile fetched', profile });
});
