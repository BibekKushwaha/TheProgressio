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

const isWebhookAuthorized = (signature: string | null): boolean => {
  const expected = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!expected) return true;
  return signature === expected;
};

const LEGACY_PLAN_PRICES: Record<string, number> = {
  PRO: 14900,
  INSTITUTION: 99900,
};

export const createOrderHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const plan = typeof req.body?.plan === 'string' ? req.body.plan.toUpperCase() : '';
    const amountPaise = LEGACY_PLAN_PRICES[plan];
    if (!amountPaise) {
      return res.status(400).json({ message: 'Invalid plan' });
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
  } catch (error) {
    console.error('Create order failed:', error);
    return res.status(500).json({ message: 'Failed to create order' });
  }
};

export const verifyPaymentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const razorpayOrderId = typeof req.body?.razorpayOrderId === 'string' ? req.body.razorpayOrderId : '';
    const plan = typeof req.body?.plan === 'string' ? req.body.plan : 'PRO';

    const existingPayment = await (prisma as any).payment.findUnique({
      where: { razorpayOrderId },
    });

    if (!existingPayment) {
      return res.status(500).json({ message: 'Payment not found' });
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
  } catch (error) {
    console.error('Verify payment failed:', error);
    return res.status(500).json({ message: 'Failed to verify payment' });
  }
};

export const paymentStatusHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

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
  } catch (error) {
    console.error('Payment status failed:', error);
    return res.status(500).json({ message: 'Failed to fetch payment status' });
  }
};

export const cancelSubscriptionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const subscription = await (prisma as any).subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PAST_DUE'] },
      },
    });

    if (!subscription) {
      return res.status(500).json({ message: 'No active subscription' });
    }

    await (prisma as any).subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return res.status(200).json({ cancelled: true });
  } catch (error) {
    console.error('Cancel subscription failed:', error);
    return res.status(500).json({ message: 'Failed to cancel subscription' });
  }
};

export const paymentHistoryHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payments = await (prisma as any).payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ payments });
  } catch (error) {
    console.error('Payment history failed:', error);
    return res.status(500).json({ message: 'Failed to fetch payment history' });
  }
};

export const createPaymentIntentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const plan = normalizePlan(req.body?.plan);
    const provider = normalizeProvider(req.body?.provider);

    if (!plan || !provider || plan === 'FREE') {
      return res.status(400).json({ message: 'Valid paid plan and provider are required' });
    }

    const amountPaise = typeof req.body?.amountPaise === 'number' ? req.body.amountPaise : undefined;
    const intent = await createPaymentIntent(userId, { plan, provider, amountPaise });

    return res.status(201).json({ message: 'Payment intent created', intent });
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return res.status(500).json({ message: 'Failed to create payment intent' });
  }
};

export const createUpiCollectHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const intentId = typeof req.body?.intentId === 'string' ? req.body.intentId.trim() : '';
    const upiId = typeof req.body?.upiId === 'string' ? req.body.upiId.trim() : '';

    if (!intentId || !upiId) {
      return res.status(400).json({ message: 'intentId and upiId are required' });
    }

    const collect = await createUpiCollectRequest(userId, intentId, upiId);
    if (!collect) {
      return res.status(404).json({ message: 'Payment intent not found' });
    }

    return res.status(200).json({ message: 'UPI collect request created', collect });
  } catch (error) {
    console.error('UPI collect creation failed:', error);
    return res.status(500).json({ message: 'Failed to create UPI collect request' });
  }
};

export const paymentWebhookHandler = async (req: Request, res: Response) => {
  try {
    const legacyEvent = typeof req.body?.event === 'string' ? req.body.event : '';
    if (legacyEvent === 'payment.captured' || legacyEvent === 'payment.failed') {
      const orderId = req.body?.payload?.payment?.entity?.order_id;
      if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({ message: 'Invalid webhook payload' });
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
      return res.status(401).json({ message: 'Unauthorized webhook' });
    }

    const paymentRef = typeof req.body?.paymentRef === 'string' ? req.body.paymentRef.trim() : '';
    const status = normalizePaymentStatus(req.body?.status);
    const provider = normalizeProvider(req.body?.provider);

    if (!paymentRef || !status) {
      return res.status(400).json({ message: 'paymentRef and valid status are required' });
    }

    const result = await applyPaymentWebhook({
      paymentRef,
      status,
      ...(provider ? { provider } : {}),
      payload: req.body,
    });

    if (!result.processed) {
      return res.status(404).json({ message: 'Payment reference not found' });
    }

    return res.status(200).json({ message: 'Webhook processed', result });
  } catch (error) {
    console.error('Payment webhook handling failed:', error);
    return res.status(500).json({ message: 'Failed to process payment webhook' });
  }
};

export const getBillingProfileHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const profile = await getUserBillingProfile(userId);
    if (!profile) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'Billing profile fetched', profile });
  } catch (error) {
    console.error('Billing profile fetch failed:', error);
    return res.status(500).json({ message: 'Failed to fetch billing profile' });
  }
};
