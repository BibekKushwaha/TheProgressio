/**
 * Razorpay Payment Service
 *
 * Handles order creation, payment verification (HMAC-SHA256),
 * and subscription management via Razorpay API.
 *
 * Required env vars:
 *   RAZORPAY_KEY_ID       — Razorpay key id (rzp_test_... or rzp_live_...)
 *   RAZORPAY_KEY_SECRET   — Razorpay key secret
 */
import crypto from "crypto";
import { prisma } from "@repo/db";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

// ─── Plan Config ────────────────────────────────────────────────────────────────

export const PLAN_CONFIG = {
    PRO: {
        name: "Pro",
        amountPaise: 14900, // ₹149
        currency: "INR",
        description: "Transition Pro — Unlimited tasks, AI tools, WhatsApp nudges",
    },
    INSTITUTION: {
        name: "Institution",
        amountPaise: 99900, // ₹999
        currency: "INR",
        description: "Transition Institution — QR attendance, batch management",
    },
} as const;

export type PlanId = keyof typeof PLAN_CONFIG;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function isConfigured(): boolean {
    return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

async function razorpayRequest<T>(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
): Promise<T> {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

    const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Razorpay API error (${response.status}): ${err}`);
    }

    return (await response.json()) as T;
}

// ─── Create Order ───────────────────────────────────────────────────────────────

export interface CreateOrderResult {
    orderId: string;
    razorpayOrderId: string;
    amountPaise: number;
    currency: string;
    keyId: string;
    prefill: { name: string; email: string };
    notes: Record<string, string>;
}

export async function createOrder(
    userId: string,
    planId: PlanId,
    paymentMethod?: string,
): Promise<CreateOrderResult> {
    const plan = PLAN_CONFIG[planId];
    if (!plan) throw new Error(`Unknown plan: ${planId}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, email: true },
    });
    if (!user) throw new Error("User not found");

    let razorpayOrderId: string;
    const notes = {
        userId,
        plan: planId,
        ...(paymentMethod ? { preferred_method: paymentMethod } : {}),
    };

    if (isConfigured()) {
        // Real Razorpay order
        const order = await razorpayRequest<{
            id: string;
            amount: number;
            currency: string;
            status: string;
        }>("/orders", "POST", {
            amount: plan.amountPaise,
            currency: plan.currency,
            receipt: `txn_${userId}_${Date.now()}`,
            notes,
        });
        razorpayOrderId = order.id;
    } else {
        // Mock mode for development
        razorpayOrderId = `order_mock_${Date.now()}`;
        console.info(`[Payment Mock] Created order ${razorpayOrderId} for plan ${planId}`);
    }

    // Store in DB
    const payment = await prisma.payment.create({
        data: {
            userId,
            razorpayOrderId,
            amountPaise: plan.amountPaise,
            currency: plan.currency,
            status: "CREATED",
            method: paymentMethod ?? null,
        },
    });

    return {
        orderId: payment.id,
        razorpayOrderId,
        amountPaise: plan.amountPaise,
        currency: plan.currency,
        keyId: RAZORPAY_KEY_ID || "rzp_test_placeholder",
        prefill: { name: user.username, email: user.email },
        notes,
    };
}

// ─── Verify Payment ─────────────────────────────────────────────────────────────

export interface VerifyPaymentResult {
    verified: boolean;
    paymentId: string;
    subscriptionId: string;
    plan: string;
    status: string;
}

export async function verifyPayment(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    userId: string;
    plan: PlanId;
}): Promise<VerifyPaymentResult> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, userId, plan: planId } = params;

    // Find the payment record
    const payment = await prisma.payment.findUnique({
        where: { razorpayOrderId },
    });
    if (!payment || payment.userId !== userId) {
        throw new Error("Payment not found or unauthorized");
    }

    // HMAC-SHA256 signature verification
    let verified = false;
    if (isConfigured()) {
        const generatedSignature = crypto
            .createHmac("sha256", RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");
        verified = generatedSignature === razorpaySignature;
    } else {
        // Mock mode — always verify
        verified = true;
        console.info(`[Payment Mock] Verified payment ${razorpayPaymentId} for order ${razorpayOrderId}`);
    }

    if (!verified) {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED", razorpayPaymentId },
        });
        throw new Error("Payment signature verification failed");
    }

    // Calculate subscription period
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Create subscription + update payment in a transaction
    const [subscription] = await prisma.$transaction([
        prisma.subscription.create({
            data: {
                userId,
                plan: planId,
                status: "ACTIVE",
                amountPaise: PLAN_CONFIG[planId].amountPaise,
                currency: "INR",
                interval: "monthly",
                currentPeriodStart: new Date(),
                currentPeriodEnd: periodEnd,
            },
        }),
        prisma.payment.update({
            where: { id: payment.id },
            data: {
                razorpayPaymentId,
                razorpaySignature,
                status: "CAPTURED",
            },
        }),
    ]);

    // Link payment to subscription
    await prisma.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id },
    });

    return {
        verified: true,
        paymentId: payment.id,
        subscriptionId: subscription.id,
        plan: planId,
        status: "ACTIVE",
    };
}

// ─── Get Subscription Status ────────────────────────────────────────────────────

export interface SubscriptionStatus {
    hasActiveSubscription: boolean;
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    amountPaise: number;
}

export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: { in: ["ACTIVE", "PAST_DUE"] },
        },
        orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
        return {
            hasActiveSubscription: false,
            plan: "FREE",
            status: "NONE",
            currentPeriodEnd: null,
            amountPaise: 0,
        };
    }

    return {
        hasActiveSubscription: true,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        amountPaise: subscription.amountPaise,
    };
}

// ─── Cancel Subscription ────────────────────────────────────────────────────────

export async function cancelSubscription(userId: string): Promise<{ cancelled: boolean }> {
    const subscription = await prisma.subscription.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
        throw new Error("No active subscription found");
    }

    await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
        },
    });

    return { cancelled: true };
}

// ─── Get Payment History ────────────────────────────────────────────────────────

export async function getPaymentHistory(userId: string): Promise<{
    payments: Array<{
        id: string;
        amountPaise: number;
        currency: string;
        status: string;
        method: string | null;
        createdAt: string;
    }>;
}> {
    const payments = await prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    return {
        payments: payments.map((p) => ({
            id: p.id,
            amountPaise: p.amountPaise,
            currency: p.currency,
            status: p.status,
            method: p.method,
            createdAt: p.createdAt.toISOString(),
        })),
    };
}

// ─── Razorpay Webhook Handler ───────────────────────────────────────────────────

export async function handleWebhook(
    body: Record<string, unknown>,
    signature: string,
): Promise<{ handled: boolean; event?: string }> {
    // Verify webhook signature
    if (isConfigured()) {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? RAZORPAY_KEY_SECRET;
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(JSON.stringify(body))
            .digest("hex");

        if (expectedSignature !== signature) {
            throw new Error("Invalid webhook signature");
        }
    }

    const event = typeof body.event === "string" ? body.event : "";
    const payload = body.payload as Record<string, unknown> | undefined;

    if (event === "payment.captured" && payload) {
        const paymentEntity = (payload as any)?.payment?.entity;
        if (paymentEntity?.order_id) {
            await prisma.payment.updateMany({
                where: { razorpayOrderId: paymentEntity.order_id },
                data: {
                    status: "CAPTURED",
                    razorpayPaymentId: paymentEntity.id,
                },
            });
        }
    }

    if (event === "payment.failed" && payload) {
        const paymentEntity = (payload as any)?.payment?.entity;
        if (paymentEntity?.order_id) {
            await prisma.payment.updateMany({
                where: { razorpayOrderId: paymentEntity.order_id },
                data: { status: "FAILED" },
            });
        }
    }

    return { handled: true, event };
}
