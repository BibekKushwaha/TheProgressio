import type { Request, Response } from 'express';
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
