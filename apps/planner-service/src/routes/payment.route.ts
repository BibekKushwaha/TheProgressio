/**
 * Payment routes — Razorpay integration
 *
 * POST /api/payments/create-order   — Create order (auth required)
 * POST /api/payments/verify         — Verify + capture (auth required)
 * GET  /api/payments/status         — Subscription status (auth required)
 * POST /api/payments/cancel         — Cancel subscription (auth required)
 * GET  /api/payments/history        — Payment history (auth required)
 * POST /api/payments/webhook        — Razorpay webhook (no auth)
 */
import { Router } from "express";
import { isAuth } from "../middleware/auth.middleware.js";
import {
    createPaymentOrder,
    verifyPaymentHandler,
    getPaymentStatus,
    cancelPaymentSubscription,
    getPaymentHistoryHandler,
    razorpayWebhook,
} from "../controllers/payment.controller.js";

const router = Router();

// Authenticated endpoints
router.post("/create-order", isAuth, createPaymentOrder);
router.post("/verify", isAuth, verifyPaymentHandler);
router.get("/status", isAuth, getPaymentStatus);
router.post("/cancel", isAuth, cancelPaymentSubscription);
router.get("/history", isAuth, getPaymentHistoryHandler);

// Razorpay webhook (no auth — verified by HMAC signature)
router.post("/webhook", razorpayWebhook);

export default router;
