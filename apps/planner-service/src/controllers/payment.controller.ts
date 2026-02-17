import type { Request, Response } from 'express';
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

const isWebhookAuthorized = (signature: string | null): boolean => {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!expected) return true;
  return signature === expected;
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

  const razorpayOrderId = typeof req.body?.razorpayOrderId === 'string' ? req.body.razorpayOrderId : '';
  const plan = typeof req.body?.plan === 'string' ? req.body.plan : 'PRO';

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
        razorpayPaymentId: req.body?.razorpayPaymentId ?? null,
        razorpaySignature: req.body?.razorpaySignature ?? null,
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

  const amountPaise = typeof req.body?.amountPaise === 'number' ? req.body.amountPaise : undefined;
  const intent = await createPaymentIntent(userId, { plan, provider, amountPaise });

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
  const legacyEvent = typeof req.body?.event === 'string' ? req.body.event : '';
  if (legacyEvent === 'payment.captured' || legacyEvent === 'payment.failed') {
    const orderId = req.body?.payload?.payment?.entity?.order_id;
    if (!orderId || typeof orderId !== 'string') {
      throw new ErrorHandler(400, 'Invalid webhook payload');
    }

    const nextStatus = legacyEvent === 'payment.captured' ? 'CAPTURED' : 'FAILED';
    await (prisma as any).payment.updateMany({
      where: { razorpayOrderId: orderId },
      data: { status: nextStatus },
    });

    return res.status(200).json({ handled: true, event: legacyEvent });
  }

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
