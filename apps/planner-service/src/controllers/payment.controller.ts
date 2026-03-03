import type { Request, Response } from 'express';
import { BillingStatus, prisma } from '@repo/db';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  applyRazorpayWebhook,
  createPaymentIntent,
  createRefund,
  DEFAULT_PLAN_PRICE_PAISE,
  getProratedUpgradeAmount,
  getUserBillingProfile,
  normalizePlan,
  normalizeProvider,
  verifyRazorpayPayment,
} from '../services/payment.service.js';
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

// ---------------------------------------------------------------------------
// POST /api/payments/intents  (also aliased from /create-order)
// ---------------------------------------------------------------------------
// Creates a Razorpay Order server-side and returns the order ID + public key
// that the frontend passes to Razorpay Checkout.js / RN SDK.
// ---------------------------------------------------------------------------

export const createPaymentIntentHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const plan = normalizePlan(req.body?.plan);
  // Accept `provider` or `paymentMethod` (mobile legacy field)
  const provider = normalizeProvider(req.body?.provider ?? req.body?.paymentMethod) ?? 'UPI';

  if (!plan || plan === 'FREE') {
    throw new ErrorHandler(400, 'A valid paid plan (PRO | INSTITUTION) is required');
  }

  // Idempotency — optional, skip on error so payment is never blocked
  const idempotencyKey =
    typeof req.headers['idempotency-key'] === 'string'
      ? req.headers['idempotency-key'].trim()
      : null;

  if (idempotencyKey) {
    try {
      const mod = (await import('@repo/cache').catch(() => null)) as any;
      if (mod?.getCache) {
        const cached = await mod.getCache(`idem:pi:${userId}:${idempotencyKey}`);
        if (cached) {
          return res.status(200).json({ message: 'Payment order fetched (cached)', intent: cached, idempotent: true });
        }
      }
    } catch { /* non-blocking */ }
  }

  const clientIp: string | undefined =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    ?? (req.socket?.remoteAddress ?? undefined);

  const intent = await createPaymentIntent(userId, {
    plan,
    provider,
    ...(clientIp ? { ip: clientIp } : {}),
  });

  if (idempotencyKey) {
    try {
      const mod = (await import('@repo/cache').catch(() => null)) as any;
      if (mod?.setCache) {
        await mod.setCache(`idem:pi:${userId}:${idempotencyKey}`, intent, { ex: 86400 }).catch(() => null);
      }
    } catch { /* non-blocking */ }
  }

  return res.status(201).json({ message: 'Razorpay order created', intent });
});

// Keep the old route name working — same handler
export const createOrderHandler = createPaymentIntentHandler;

// ---------------------------------------------------------------------------
// POST /api/payments/verify
// ---------------------------------------------------------------------------
// Called by the frontend after Razorpay Checkout completes successfully.
// Verifies the HMAC signature and upgrades the user's plan.
// ---------------------------------------------------------------------------

export const verifyPaymentHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const razorpayOrderId   = typeof req.body?.razorpayOrderId   === 'string' ? req.body.razorpayOrderId.trim()   : '';
  const razorpayPaymentId = typeof req.body?.razorpayPaymentId === 'string' ? req.body.razorpayPaymentId.trim() : '';
  const razorpaySignature = typeof req.body?.razorpaySignature === 'string' ? req.body.razorpaySignature.trim() : '';

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ErrorHandler(400, 'razorpayOrderId, razorpayPaymentId and razorpaySignature are all required');
  }

  const result = await verifyRazorpayPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

  if (!result.verified) {
    const status = result.reason === 'invalid_signature' ? 400 : 404;
    throw new ErrorHandler(status, result.reason);
  }

  return res.status(200).json({
    verified: true,
    idempotent: result.idempotent ?? false,
    orderId: result.orderId,
    plan: (result as any).plan ?? null,
  });
});

// ---------------------------------------------------------------------------
// POST /api/payments/webhook   (no auth — verified by X-Razorpay-Signature)
// ---------------------------------------------------------------------------
// Register this endpoint in Razorpay Dashboard → Settings → Webhooks.
// Events: payment.captured, payment.failed
// Secret: RAZORPAY_WEBHOOK_SECRET env var
// ---------------------------------------------------------------------------

export const paymentWebhookHandler = TryCatch(async (req: Request, res: Response) => {
  // Razorpay sends signature in X-Razorpay-Signature
  const sigHeader = req.headers['x-razorpay-signature'];
  const signature = Array.isArray(sigHeader) ? sigHeader[0] ?? null : sigHeader ?? null;

  // The signature is computed over the raw request body string.
  // We need the raw body — Express must be configured with express.raw() for this route
  // (see index.ts). Fall back to re-serialising if plain object.
  const rawBody: string =
    Buffer.isBuffer((req as any).rawBody)
      ? (req as any).rawBody.toString('utf8')
      : typeof (req as any).rawBody === 'string'
        ? (req as any).rawBody
        : JSON.stringify(req.body);

  const result = await applyRazorpayWebhook(rawBody, signature);

  if (!result.authorized) {
    throw new ErrorHandler(401, `Webhook unauthorized: ${result.reason}`);
  }

  return res.status(200).json({ received: true, ...result });
});

// ---------------------------------------------------------------------------
// GET /api/payments/checkout   (no auth — opened by mobile in expo-web-browser)
// ---------------------------------------------------------------------------
// Serves a minimal HTML page that auto-opens Razorpay Checkout and
// redirects to transition://subscription?<rzp_fields> on completion.
// The mobile app calls openAuthSessionAsync(url, 'transition://subscription')
// and reads the parameters from the returned URL to call /verify.
// ---------------------------------------------------------------------------

export const checkoutPageHandler = TryCatch(async (req: Request, res: Response) => {
  const orderId  = typeof req.query.orderId === 'string' ? req.query.orderId : '';
  const keyId    = typeof req.query.keyId   === 'string' ? req.query.keyId   : '';
  const amount   = typeof req.query.amount  === 'string' ? req.query.amount  : '0';
  const plan     = typeof req.query.plan    === 'string' ? req.query.plan    : 'plan';

  if (!orderId || !keyId) {
    throw new ErrorHandler(400, 'orderId and keyId are required');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Checkout</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body { background:#0f172a; display:flex; align-items:center; justify-content:center;
      height:100vh; margin:0; font-family:sans-serif; color:#94a3b8; }
  </style>
</head>
<body>
  <p>Opening secure checkout…</p>
  <script>
    var rzp = new Razorpay({
      key:         ${JSON.stringify(keyId)},
      order_id:    ${JSON.stringify(orderId)},
      amount:      ${JSON.stringify(amount)},
      currency:    "INR",
      name:        "Student Activity Tracker",
      description: ${JSON.stringify(plan + " Plan")},
      handler: function(r) {
        window.location.href =
          "transition://subscription?razorpay_order_id="   + encodeURIComponent(r.razorpay_order_id)   +
          "&razorpay_payment_id=" + encodeURIComponent(r.razorpay_payment_id) +
          "&razorpay_signature="  + encodeURIComponent(r.razorpay_signature);
      },
      modal: { ondismiss: function() { window.location.href = "transition://subscription?cancelled=true"; } },
      theme: { color: "#6366f1" }
    });
    rzp.open();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
});

// ---------------------------------------------------------------------------
// GET /api/payments/me
// ---------------------------------------------------------------------------

export const getBillingProfileHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = await getUserBillingProfile(userId);
  if (!profile) throw new ErrorHandler(404, 'User not found');
  return res.status(200).json({ message: 'Billing profile fetched', profile });
});

// ---------------------------------------------------------------------------
// GET /api/payments/status  (kept for mobile backwards-compat)
// ---------------------------------------------------------------------------

export const paymentStatusHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = await getUserBillingProfile(userId);
  if (!profile) throw new ErrorHandler(404, 'User not found');

  const isActive = profile.planStatus === BillingStatus.ACTIVE;
  return res.status(200).json({
    hasActiveSubscription: isActive,
    plan: profile.plan,
    status: profile.planStatus,
    renewalAt: profile.renewalAt ?? null,
    amountPaise: isActive ? (DEFAULT_PLAN_PRICE_PAISE[profile.plan] ?? 0) : 0,
  });
});

// ---------------------------------------------------------------------------
// POST /api/payments/cancel
// ---------------------------------------------------------------------------

export const cancelSubscriptionHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planStatus: true, plan: true },
  });

  if (
    !user ||
    (user.planStatus !== BillingStatus.ACTIVE && user.planStatus !== BillingStatus.PAST_DUE)
  ) {
    throw new ErrorHandler(404, 'No active subscription to cancel');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { planStatus: BillingStatus.CANCELED },
  });

  return res.status(200).json({ cancelled: true, plan: user.plan });
});

// ---------------------------------------------------------------------------
// GET /api/payments/history
// ---------------------------------------------------------------------------

export const paymentHistoryHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const payments = await prisma.paymentEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      intentId:          true,
      paymentRef:        true,
      plan:              true,
      provider:          true,
      amountPaise:       true,
      status:            true,
      eventType:         true,
      refundId:          true,
      refundedAt:        true,
      refundAmountPaise: true,
      retryCount:        true,
      createdAt:         true,
    },
  });

  return res.status(200).json({ payments });
});

// ---------------------------------------------------------------------------
// POST /api/payments/refund
// ---------------------------------------------------------------------------
// Issues a (full or partial) refund on a previously captured payment.
// Body: { paymentRef: string, amountPaise?: number }
// ---------------------------------------------------------------------------

export const refundHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const paymentRef = typeof req.body?.paymentRef === 'string' ? req.body.paymentRef.trim() : null;
  if (!paymentRef) throw new ErrorHandler(400, 'paymentRef is required');

  const amountPaise = typeof req.body?.amountPaise === 'number' ? req.body.amountPaise : undefined;
  if (amountPaise !== undefined && (isNaN(amountPaise) || amountPaise < 100)) {
    throw new ErrorHandler(400, 'amountPaise must be ≥ 100 paise (₹1) for a partial refund');
  }

  const result = await createRefund(userId, paymentRef, amountPaise);
  if (!result.refunded) {
    throw new ErrorHandler(400, result.reason ?? 'Refund failed');
  }

  return res.status(200).json(result);
});

// ---------------------------------------------------------------------------
// POST /api/payments/upgrade
// ---------------------------------------------------------------------------
// Creates a prorated upgrade order — charges only the difference between
// the current plan (credit) and the target plan for the remaining cycle days.
// Body: { targetPlan: BillingPlan }
// ---------------------------------------------------------------------------

export const upgradeHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const targetPlan = normalizePlan(req.body?.targetPlan);
  if (!targetPlan || targetPlan === 'FREE') {
    throw new ErrorHandler(400, 'targetPlan must be PRO or INSTITUTION');
  }

  const profile = await getUserBillingProfile(userId);
  if (!profile) throw new ErrorHandler(404, 'User not found');

  const currentPlan = profile.plan;

  if (currentPlan === targetPlan) {
    throw new ErrorHandler(400, 'You are already on this plan');
  }

  // Compute prorated charge (server-side, not client-supplied)
  const upgradeAmountPaise = getProratedUpgradeAmount(
    currentPlan,
    targetPlan,
    profile.renewalAt ?? null,
  );

  if (upgradeAmountPaise === 0) {
    // Downgrade — no payment needed, just switch
    throw new ErrorHandler(400, 'Downgrades do not require a payment. Cancel and resubscribe.');
  }

  const provider = normalizeProvider(req.body?.provider ?? 'UPI') ?? 'UPI';

  const intent = await createPaymentIntent(userId, {
    plan:                targetPlan,
    provider,
    eventType:           'UPGRADE',
    overrideAmountPaise: upgradeAmountPaise,
  });

  return res.status(201).json({
    ...intent,
    // UI hint: display prorated amount and what the full price would be
    fullAmountPaise:    DEFAULT_PLAN_PRICE_PAISE[targetPlan],
    proratedAmountPaise: upgradeAmountPaise,
    currentPlan,
  });
});

