import request from 'supertest';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import crypto from 'crypto';

// ─── Mocks ──────────────────────────────────────────────────────────────────────

// Mock auth middleware to inject a test user
vi.mock('../src/middleware/auth.middleware.js', () => ({
  isAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4 };
    next();
  },
  enforceReadOnlyWrites: () => (req: any, res: any, next: any) => next(),
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
      task: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      category: {
        create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(),
      },
      subTask: {
        create: vi.fn(), createMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(),
      },
      attachment: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
      rotationPattern: {
        create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      paymentEvent: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      subscription: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
      auditLog: { create: vi.fn() },
    },
    Status,
    Priority,
    AttendanceStatus,
    AttendanceMethod,
    BillingStatus,
    BillingPlan,
  };
});

import { app } from '../src/index.js';
import { prisma } from '@repo/db';

// ─── Payment Service Tests ──────────────────────────────────────────────────────

describe('Payment endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.PAYMENT_WEBHOOK_SECRET;
  });

  // ─── POST /api/payments/create-order ──────────────────────────────────────────

  describe('POST /api/payments/create-order', () => {
    it('creates a mock order for PRO plan', async () => {
      (prisma as any).user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'Tester',
        email: 'test@example.com',
      });
      (prisma as any).payment.create.mockResolvedValue({
        id: 'pay-1',
        userId: 'user-1',
        razorpayOrderId: 'order_mock_123',
        amountPaise: 14900,
        currency: 'INR',
        status: 'CREATED',
      });

      const res = await request(app)
        .post('/api/payments/create-order')
        .send({ plan: 'PRO', method: 'upi' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('razorpayOrderId');
      expect(res.body.amountPaise).toBe(14900);
      expect(res.body.currency).toBe('INR');
    });

    it('creates a mock order for INSTITUTION plan', async () => {
      (prisma as any).user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'Tester',
        email: 'test@example.com',
      });
      (prisma as any).payment.create.mockResolvedValue({
        id: 'pay-2',
        userId: 'user-1',
        razorpayOrderId: 'order_mock_456',
        amountPaise: 99900,
        currency: 'INR',
        status: 'CREATED',
      });

      const res = await request(app)
        .post('/api/payments/create-order')
        .send({ plan: 'INSTITUTION' });

      expect(res.status).toBe(201);
      expect(res.body.amountPaise).toBe(99900);
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
    it('verifies payment and creates subscription (mock mode)', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
      const mockPayment = {
        id: 'pay-1',
        userId: 'user-1',
        razorpayOrderId: 'order_mock_123',
        amountPaise: 14900,
        status: 'CREATED',
      };
      const mockSubscription = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'PRO',
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      (prisma as any).payment.findUnique.mockResolvedValue(mockPayment);
      (prisma as any).$transaction.mockResolvedValue([mockSubscription, mockPayment]);
      (prisma as any).payment.update.mockResolvedValue(mockPayment);

      const razorpayOrderId = 'order_mock_123';
      const razorpayPaymentId = 'pay_mock_111';
      const razorpaySignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          plan: 'PRO',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('verified', true);
      expect(res.body).toHaveProperty('subscriptionId', 'sub-1');
      expect(res.body).toHaveProperty('plan', 'PRO');
      expect(res.body).toHaveProperty('status', 'ACTIVE');
    });

    it('rejects when payment not found', async () => {
      process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
      (prisma as any).payment.findUnique.mockResolvedValue(null);
      const razorpayOrderId = 'nonexistent';
      const razorpayPaymentId = 'pay_xyz';
      const razorpaySignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          plan: 'PRO',
        });

      expect(res.status).toBe(404);
    });
  });

  // ─── GET /api/payments/status ─────────────────────────────────────────────────

  describe('GET /api/payments/status', () => {
    it('returns active subscription details', async () => {
      const mockSub = {
        id: 'sub-1',
        plan: 'PRO',
        status: 'ACTIVE',
        amountPaise: 14900,
        currentPeriodEnd: new Date('2025-09-01'),
        createdAt: new Date(),
      };
      (prisma as any).subscription.findFirst.mockResolvedValue(mockSub);

      const res = await request(app).get('/api/payments/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hasActiveSubscription', true);
      expect(res.body.plan).toBe('PRO');
      expect(res.body.amountPaise).toBe(14900);
    });

    it('returns free plan when no subscription', async () => {
      (prisma as any).subscription.findFirst.mockResolvedValue(null);

      const res = await request(app).get('/api/payments/status');

      expect(res.status).toBe(200);
      expect(res.body.hasActiveSubscription).toBe(false);
      expect(res.body.plan).toBe('FREE');
    });
  });

  // ─── POST /api/payments/cancel ────────────────────────────────────────────────

  describe('POST /api/payments/cancel', () => {
    it('cancels an active subscription', async () => {
      const activeSub = {
        id: 'sub-1',
        userId: 'user-1',
        plan: 'PRO',
        status: 'ACTIVE',
      };
      (prisma as any).subscription.findFirst.mockResolvedValue(activeSub);
      (prisma as any).subscription.update.mockResolvedValue({
        ...activeSub,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      });

      const res = await request(app).post('/api/payments/cancel');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('cancelled', true);
    });

    it('returns error when no active subscription', async () => {
      (prisma as any).subscription.findFirst.mockResolvedValue(null);

      const res = await request(app).post('/api/payments/cancel');

      expect(res.status).toBe(404);
    });
  });

  // ─── GET /api/payments/history ────────────────────────────────────────────────

  describe('GET /api/payments/history', () => {
    it('returns payment history', async () => {
      const mockPayments = [
        {
          id: 'pay-1',
          amountPaise: 14900,
          currency: 'INR',
          status: 'CAPTURED',
          method: 'upi',
          createdAt: new Date('2025-07-01'),
        },
        {
          id: 'pay-2',
          amountPaise: 14900,
          currency: 'INR',
          status: 'CREATED',
          method: 'card',
          createdAt: new Date('2025-06-01'),
        },
      ];
      (prisma as any).payment.findMany.mockResolvedValue(mockPayments);

      const res = await request(app).get('/api/payments/history');

      expect(res.status).toBe(200);
      expect(res.body.payments).toHaveLength(2);
      expect(res.body.payments[0]).toHaveProperty('amountPaise', 14900);
      expect(res.body.payments[0]).toHaveProperty('status', 'CAPTURED');
    });

    it('returns empty array when no payments', async () => {
      (prisma as any).payment.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/payments/history');

      expect(res.status).toBe(200);
      expect(res.body.payments).toHaveLength(0);
    });
  });

  // ─── POST /api/payments/webhook ───────────────────────────────────────────────

  describe('POST /api/payments/webhook', () => {
    it('handles payment.captured webhook', async () => {
      process.env.PAYMENT_WEBHOOK_SECRET = 'pay-webhook-secret';
      (prisma as any).paymentEvent.findUnique.mockResolvedValue({
        paymentRef: 'pay_rzp_111',
        userId: 'user-1',
        plan: 'PRO',
      });
      (prisma as any).paymentEvent.update.mockResolvedValue({
        paymentRef: 'pay_rzp_111',
        status: 'SUCCESS',
      });
      (prisma as any).$transaction.mockImplementation(async (fn: any) => fn(prisma));

      const body = {
        paymentRef: 'pay_rzp_111',
        status: 'SUCCESS',
        provider: 'RAZORPAY',
      };

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-payment-signature', 'pay-webhook-secret')
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('result.processed', true);
    });

    it('handles payment.failed webhook', async () => {
      process.env.PAYMENT_WEBHOOK_SECRET = 'pay-webhook-secret';
      (prisma as any).paymentEvent.findUnique.mockResolvedValue({
        paymentRef: 'pay_rzp_222',
        userId: 'user-1',
        plan: 'PRO',
      });
      (prisma as any).paymentEvent.update.mockResolvedValue({
        paymentRef: 'pay_rzp_222',
        status: 'FAILED',
      });
      (prisma as any).$transaction.mockImplementation(async (fn: any) => fn(prisma));

      const body = {
        paymentRef: 'pay_rzp_222',
        status: 'FAILED',
        provider: 'RAZORPAY',
      };

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-payment-signature', 'pay-webhook-secret')
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('result.processed', true);
    });
  });
});
