/**
 * Payment Controller — Razorpay order creation, verification, subscription management
 */
import type { Response } from "express";
import {
    createOrder,
    verifyPayment,
    getSubscriptionStatus,
    cancelSubscription,
    getPaymentHistory,
    handleWebhook,
} from "../services/payment.service.js";
import type { PlanId } from "../services/payment.service.js";

interface AuthenticatedRequest {
    user?: { id: string; username: string; email: string };
    body: any;
    params: any;
    headers: any;
}

/**
 * POST /api/payments/create-order
 * Body: { plan: "PRO" | "INSTITUTION", method?: "upi" | "card" | "netbanking" }
 */
export const createPaymentOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { plan, method } = req.body ?? {};
        if (!plan || !["PRO", "INSTITUTION"].includes(plan)) {
            res.status(400).json({ message: "plan must be 'PRO' or 'INSTITUTION'" });
            return;
        }

        const result = await createOrder(userId, plan as PlanId, method);
        res.status(201).json({ message: "Order created", ...result });
    } catch (error) {
        console.error("Error creating payment order:", error);
        res.status(500).json({
            message: "Failed to create order",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * POST /api/payments/verify
 * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan }
 */
export const verifyPaymentHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = req.body ?? {};

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            res.status(400).json({ message: "razorpayOrderId, razorpayPaymentId, and razorpaySignature are required" });
            return;
        }

        if (!plan || !["PRO", "INSTITUTION"].includes(plan)) {
            res.status(400).json({ message: "plan must be 'PRO' or 'INSTITUTION'" });
            return;
        }

        const result = await verifyPayment({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            userId,
            plan: plan as PlanId,
        });

        res.status(200).json({ message: "Payment verified", ...result });
    } catch (error) {
        console.error("Error verifying payment:", error);
        const status = (error instanceof Error && error.message.includes("signature")) ? 400 : 500;
        res.status(status).json({
            message: "Payment verification failed",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * GET /api/payments/status
 */
export const getPaymentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const status = await getSubscriptionStatus(userId);
        res.status(200).json({ message: "Subscription status", ...status });
    } catch (error) {
        console.error("Error fetching payment status:", error);
        res.status(500).json({ message: "Failed to get status" });
    }
};

/**
 * POST /api/payments/cancel
 */
export const cancelPaymentSubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const result = await cancelSubscription(userId);
        res.status(200).json({ message: "Subscription cancelled", ...result });
    } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({
            message: "Failed to cancel subscription",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * GET /api/payments/history
 */
export const getPaymentHistoryHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

        const history = await getPaymentHistory(userId);
        res.status(200).json({ message: "Payment history", ...history });
    } catch (error) {
        console.error("Error fetching payment history:", error);
        res.status(500).json({ message: "Failed to get payment history" });
    }
};

/**
 * POST /api/payments/webhook (no auth — Razorpay calls this)
 */
export const razorpayWebhook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const signature = req.headers["x-razorpay-signature"] as string | undefined;
        if (!signature) {
            res.status(400).json({ message: "Missing x-razorpay-signature header" });
            return;
        }

        const result = await handleWebhook(req.body, signature);
        res.status(200).json(result);
    } catch (error) {
        console.error("Webhook error:", error);
        const status = (error instanceof Error && error.message.includes("signature")) ? 400 : 500;
        res.status(status).json({ message: "Webhook failed" });
    }
};
