import express from 'express';
import { isAuth } from '../middleware/auth.middleware.js';
import {
  cancelSubscriptionHandler,
  checkoutPageHandler,
  createOrderHandler,
  createPaymentIntentHandler,
  getBillingProfileHandler,
  paymentHistoryHandler,
  paymentStatusHandler,
  paymentWebhookHandler,
  refundHandler,
  upgradeHandler,
  verifyPaymentHandler,
} from '../controllers/payment.controller.js';

const router = express.Router();

// ── New Razorpay-backed endpoints ────────────────────────────────────────────
router.post('/intents', isAuth, createPaymentIntentHandler);   // Step 1: create Razorpay order
router.post('/verify',  isAuth, verifyPaymentHandler);          // Step 4: verify HMAC + activate user
router.get('/me',       isAuth, getBillingProfileHandler);      // Current billing profile
router.get('/checkout',         checkoutPageHandler);           // Mobile: HTML checkout page (no auth)

// ── Subscription lifecycle ────────────────────────────────────────────────────
router.post('/refund',  isAuth, refundHandler);                 // Refund a captured payment
router.post('/upgrade', isAuth, upgradeHandler);                // Upgrade plan (prorated charge)

// ── Legacy aliases (mobile backwards-compat) ─────────────────────────────────
router.post('/create-order', isAuth, createOrderHandler);       // Same as /intents
router.get('/status',        isAuth, paymentStatusHandler);
router.post('/cancel',       isAuth, cancelSubscriptionHandler);
router.get('/history',       isAuth, paymentHistoryHandler);

// ── Razorpay server-to-server webhook (no auth) ───────────────────────────────
// Register URL in Razorpay Dashboard → Settings → Webhooks
// Events: payment.captured, payment.failed, refund.processed
// Secret: RAZORPAY_WEBHOOK_SECRET
router.post('/webhook', paymentWebhookHandler);

export default router;

