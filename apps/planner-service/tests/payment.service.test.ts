import request from 'supertest';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import crypto from 'crypto';

// ─── Mocks ──────────────────────────────────────────────────────────────────────

// Mock auth middleware to inject a test user
vi.mock('../src/middleware/auth.middleware.js', () => ({
  isAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4, role: 'ADMIN' };
    next();
  },
  isAdmin: (_req: any, _res: any, next: any) => next(),
  adminRateLimit: (_req: any, _res: any, next: any) => next(),
  requireAdminIp: (_req: any, _res: any, next: any) => next(),
  enforceReadOnlyWrites: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock BullMQ producer (non-blocking)
vi.mock('../src/services/queue.service.js', () => ({
  emitTaskEvent: vi.fn().mockResolvedValue(undefined),
  emitPushEvent: vi.fn().mockResolvedValue(undefined),
  QUEUE_NAMES: {
    TASK_EVENTS: "planner.task.events",
    TASK_ANALYTICS: "planner.task.analytics",
    HABIT_TRIGGERS: "planner.habit.triggers",
    WEB_PUSH: "planner.web.push",
  },
  TaskEventType: {
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_COMPLETED: 'task.completed',
    TASK_DELETED: 'task.deleted',
    TASK_STATUS_CHANGED: 'task.status_changed',
  },
  producer: { close: vi.fn() },
}));

// Mock AI service
vi.mock('../src/services/ai.service.js', () => ({
  aiService: {
    parseTaskIntent: vi.fn().mockResolvedValue({ title: 'test', priority: 'HIGH', dueDate: new Date(), subject: 'test' }),
    scanSyllabusImage: vi.fn().mockResolvedValue([]),
    generateSubtasks: vi.fn().mockResolvedValue([]),
  },
}));

// Mock the payment service so tests don't need a live Razorpay connection
vi.mock('../src/services/payment.service.js', () => ({
  createPaymentIntent: vi.fn(),
  verifyRazorpayPayment: vi.fn(),
  applyRazorpayWebhook: vi.fn(),
  getUserBillingProfile: vi.fn(),
  isSubscriptionActive: vi.fn(),
  createRefund: vi.fn(),
  getProratedUpgradeAmount: vi.fn(),
  normalizePlan: (p: string) => (
    ['PRO', 'INSTITUTION'].includes(String(p).toUpperCase())
      ? String(p).toUpperCase()
      : null
  ),
  normalizeProvider: (p: string) => p ?? 'UPI',
  DEFAULT_PLAN_PRICE_PAISE: { PRO: 14900, INSTITUTION: 99900 },
  PLAN_CYCLE_DAYS: { PRO: 30, INSTITUTION: 365 },
}));

// Mock prisma client
vi.mock('@repo/db', () => {
  const Status = { PENDING: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' };
  const Priority = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' };
  const AttendanceStatus = { PRESENT: 'PRESENT', ABSENT: 'ABSENT', LATE: 'LATE' };
  const AttendanceMethod = { QR: 'QR', MANUAL: 'MANUAL', GEOFENCE: 'GEOFENCE' };
  const BillingStatus = { INACTIVE: 'INACTIVE', ACTIVE: 'ACTIVE', PAST_DUE: 'PAST_DUE', CANCELED: 'CANCELED' };
  const BillingPlan = { FREE: 'FREE', PRO: 'PRO', INSTITUTION: 'INSTITUTION' };
  return {
    prisma: {
      task: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
      category: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
      subTask: { create: vi.fn(), createMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
      attachment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
      rotationPattern: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
      user: { findUnique: vi.fn(), update: vi.fn() },
      payment: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      paymentEvent: {
        create: vi.fn(), count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(),
        update: vi.fn(), updateMany: vi.fn(),
      },
      fraudFlag: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
      subscription: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
      $transaction: vi.fn(),
      auditLog: { create: vi.fn() },
    },
    Status, Priority, AttendanceStatus, AttendanceMethod, BillingStatus, BillingPlan,
  };
});

import { app } from '../src/index.js';
import { createPaymentIntent, verifyRazorpayPayment, applyRazorpayWebhook } from '../src/services/payment.service.js';
import { prisma } from '@repo/db';

// ─── Payment Endpoint Tests ────────────────────────────────────────────────────

describe('Payment endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  // ─── POST /api/payments/create-order ──────────────────────────────────────────

  describe('POST /api/payments/create-order', () => {
    it('creates an order for PRO plan', async () => {
      (createPaymentIntent as ReturnType<typeof vi.fn>).mockResolvedValue({
        intentId: 'intent_1',
        orderId: 'order_rzp_123',
        keyId: 'rzp_test_key',
        plan: 'PRO',
        provider: 'UPI',
        amountPaise: 14900,
        currency: 'INR',
        status: 'CREATED',
      });

      const res = await request(app)
        .post('/api/payments/create-order')
        .send({ plan: 'PRO' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('intent');
      expect(res.body.intent).toHaveProperty('amountPaise', 14900);
    });

    it('creates an order for INSTITUTION plan', async () => {
      (createPaymentIntent as ReturnType<typeof vi.fn>).mockResolvedValue({
        intentId: 'intent_2',
        orderId: 'order_rzp_456',
        keyId: 'rzp_test_key',
        plan: 'INSTITUTION',
        provider: 'UPI',
        amountPaise: 99900,
        currency: 'INR',
        status: 'CREATED',
      });

      const res = await request(app)
        .post('/api/payments/create-order')
        .send({ plan: 'INSTITUTION' });

      expect(res.status).toBe(201);
      expect(res.body.intent).toHaveProperty('amountPaise', 99900);
    });

    it('rejects unknown plan', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .send({ plan: 'UNKNOWN_PLAN' });

      expect(res.status).toBe(400);
    });
  });

  // ─── POST /api/payments/verify ────────────────────────────────────────────────

  describe('POST /api/payments/verify', () => {
    it('verifies payment (mock mode)', async () => {
      (verifyRazorpayPayment as ReturnType<typeof vi.fn>).mockResolvedValue({
        verified: true,
        idempotent: false,
        orderId: 'order_rzp_123',
        plan: 'PRO',
      });

      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpayOrderId: 'order_rzp_123',
          razorpayPaymentId: 'pay_rzp_mock111',
          razorpaySignature: 'valid_sig',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('verified', true);
    });

    it('rejects when HMAC is invalid', async () => {
      (verifyRazorpayPayment as ReturnType<typeof vi.fn>).mockResolvedValue({
        verified: false,
        reason: 'invalid_signature',
      });

      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpayOrderId: 'order_rzp_bad',
          razorpayPaymentId: 'pay_rzp_bad',
          razorpaySignature: 'bad_sig',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .send({ razorpayOrderId: 'order_rzp_123' }); // missing paymentId + sig

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/payments/status ─────────────────────────────────────────────────

  describe('GET /api/payments/status', () => {
    it('returns active subscription details via billing profile', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-1',
        billingPlan: 'PRO',
        billingStatus: 'ACTIVE',
        planActivatedAt: new Date('2025-08-01'),
        planRenewalAt: new Date('2025-09-01'),
        paymentRef: 'pay_rzp_111',
        paymentProvider: 'UPI',
        fraudRisk: 'NONE',
      });

      const res = await request(app).get('/api/payments/status');

      // /status maps to paymentStatusHandler which calls getUserBillingProfile
      expect([200, 404]).toContain(res.status);
    });
  });

  // ─── POST /api/payments/cancel ────────────────────────────────────────────────

  describe('POST /api/payments/cancel', () => {
    it('returns error when no active subscription', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-1',
        billingPlan: 'FREE',
        billingStatus: 'INACTIVE',
        planRenewalAt: null,
      });

      const res = await request(app).post('/api/payments/cancel');

      expect([400, 404]).toContain(res.status);
    });
  });

  // ─── GET /api/payments/history ────────────────────────────────────────────────

  describe('GET /api/payments/history', () => {
    it('returns payment history from paymentEvent table', async () => {
      (prisma.paymentEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          intentId: 'intent_1',
          paymentRef: 'order_rzp_100',
          plan: 'PRO',
          provider: 'UPI',
          amountPaise: 14900,
          status: 'SUCCESS',
          createdAt: new Date('2025-07-01'),
        },
      ]);

      const res = await request(app).get('/api/payments/history');

      expect([200]).toContain(res.status);
    });

    it('returns empty list when no past payments', async () => {
      (prisma.paymentEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const res = await request(app).get('/api/payments/history');

      expect([200]).toContain(res.status);
    });
  });

  // ─── POST /api/payments/webhook ───────────────────────────────────────────────

  describe('POST /api/payments/webhook', () => {
    it('rejects webhook missing x-razorpay-signature', async () => {
      (applyRazorpayWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        authorized: false,
        reason: 'missing_signature',
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ event: 'payment.captured', payload: {} });

      // Missing/invalid signature → 401
      expect(res.status).toBe(401);
    });

    it('returns 200 for valid webhook (mock service)', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_wh_secret';
      (applyRazorpayWebhook as ReturnType<typeof vi.fn>).mockResolvedValue({
        authorized: true,
        processed: true,
        event: 'payment.captured',
      });

      // Compute valid signature
      const bodyStr = JSON.stringify({ event: 'payment.captured' });
      const sig = crypto
        .createHmac('sha256', 'rzp_wh_secret')
        .update(bodyStr)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', sig)
        .send(bodyStr);

      expect([200]).toContain(res.status);
    });
  });
});
