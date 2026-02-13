import request from 'supertest';
import { describe, it, beforeEach, expect, vi } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────────

// Mock auth middleware to inject a test user
vi.mock('../src/middleware/auth.middleware.js', () => ({
  isAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4 };
    next();
  },
  enforceReadOnlyWrites: (_req: any, _res: any, next: any) => next(),
}));

// Mock Kafka producer (non-blocking)
vi.mock('../src/services/producer.service.js', () => ({
  emitTaskEvent: vi.fn().mockResolvedValue(undefined),
  TaskEventType: {
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_COMPLETED: 'task.completed',
    TASK_DELETED: 'task.deleted',
    TASK_STATUS_CHANGED: 'task.status_changed',
  },
  producer: { connect: vi.fn(), send: vi.fn(), disconnect: vi.fn() },
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
      },
      payment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      subscription: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    Status,
    Priority,
  };
});

import { app } from '../src/index.js';
import { prisma } from '@repo/db';

// ─── Payment Service Tests ──────────────────────────────────────────────────────

describe('Payment endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── POST /api/payments/create-order ──────────────────────────────────────────

  describe('POST /api/payments/create-order', () => {
    it('creates a mock order for PRO plan', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        username: 'Tester',
        email: 'test@example.com',
      });
      (prisma.payment.create as any).mockResolvedValue({
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
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        username: 'Tester',
        email: 'test@example.com',
      });
      (prisma.payment.create as any).mockResolvedValue({
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

      (prisma.payment.findUnique as any).mockResolvedValue(mockPayment);
      (prisma.$transaction as any).mockResolvedValue([mockSubscription, mockPayment]);
      (prisma.payment.update as any).mockResolvedValue(mockPayment);

      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpayOrderId: 'order_mock_123',
          razorpayPaymentId: 'pay_mock_111',
          razorpaySignature: 'mock_sig',
          plan: 'PRO',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('verified', true);
      expect(res.body).toHaveProperty('subscriptionId', 'sub-1');
      expect(res.body).toHaveProperty('plan', 'PRO');
      expect(res.body).toHaveProperty('status', 'ACTIVE');
    });

    it('rejects when payment not found', async () => {
      (prisma.payment.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpayOrderId: 'nonexistent',
          razorpayPaymentId: 'pay_xyz',
          razorpaySignature: 'sig',
          plan: 'PRO',
        });

      expect(res.status).toBe(500);
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
      (prisma.subscription.findFirst as any).mockResolvedValue(mockSub);

      const res = await request(app).get('/api/payments/status');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hasActiveSubscription', true);
      expect(res.body.plan).toBe('PRO');
      expect(res.body.amountPaise).toBe(14900);
    });

    it('returns free plan when no subscription', async () => {
      (prisma.subscription.findFirst as any).mockResolvedValue(null);

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
      (prisma.subscription.findFirst as any).mockResolvedValue(activeSub);
      (prisma.subscription.update as any).mockResolvedValue({
        ...activeSub,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      });

      const res = await request(app).post('/api/payments/cancel');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('cancelled', true);
    });

    it('returns error when no active subscription', async () => {
      (prisma.subscription.findFirst as any).mockResolvedValue(null);

      const res = await request(app).post('/api/payments/cancel');

      expect(res.status).toBe(500);
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
      (prisma.payment.findMany as any).mockResolvedValue(mockPayments);

      const res = await request(app).get('/api/payments/history');

      expect(res.status).toBe(200);
      expect(res.body.payments).toHaveLength(2);
      expect(res.body.payments[0]).toHaveProperty('amountPaise', 14900);
      expect(res.body.payments[0]).toHaveProperty('status', 'CAPTURED');
    });

    it('returns empty array when no payments', async () => {
      (prisma.payment.findMany as any).mockResolvedValue([]);

      const res = await request(app).get('/api/payments/history');

      expect(res.status).toBe(200);
      expect(res.body.payments).toHaveLength(0);
    });
  });

  // ─── POST /api/payments/webhook ───────────────────────────────────────────────

  describe('POST /api/payments/webhook', () => {
    it('handles payment.captured webhook', async () => {
      (prisma.payment.updateMany as any).mockResolvedValue({ count: 1 });

      const body = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_111',
              order_id: 'order_mock_123',
              amount: 14900,
            },
          },
        },
      };

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', 'test_sig')
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('handled', true);
      expect(res.body.event).toBe('payment.captured');
    });

    it('handles payment.failed webhook', async () => {
      (prisma.payment.updateMany as any).mockResolvedValue({ count: 1 });

      const body = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: { id: 'pay_rzp_222', order_id: 'order_mock_456' },
          },
        },
      };

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', 'test_sig')
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.handled).toBe(true);
      expect(res.body.event).toBe('payment.failed');
    });
  });
});
