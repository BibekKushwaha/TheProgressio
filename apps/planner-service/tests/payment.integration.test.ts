import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.middleware.js', () => ({
  isAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4 };
    next();
  },
}));

vi.mock('../src/services/producer.service.js', () => ({
  producer: { connect: vi.fn(), send: vi.fn(), disconnect: vi.fn() },
  emitTaskEvent: vi.fn(),
  TaskEventType: {
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_COMPLETED: 'task.completed',
    TASK_DELETED: 'task.deleted',
    TASK_STATUS_CHANGED: 'task.status_changed',
  },
}));

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    paymentEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@repo/db', () => ({
  prisma: mockPrisma,
  BillingPlan: { FREE: 'FREE', PRO: 'PRO', INSTITUTION: 'INSTITUTION' },
  BillingStatus: { INACTIVE: 'INACTIVE', ACTIVE: 'ACTIVE', PAST_DUE: 'PAST_DUE', CANCELED: 'CANCELED' },
  Status: { PENDING: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' },
  Priority: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  AttendanceStatus: { PRESENT: 'PRESENT', ABSENT: 'ABSENT', LATE: 'LATE' },
  AttendanceMethod: { QR: 'QR', MANUAL: 'MANUAL', GEOFENCE: 'GEOFENCE' },
}));

import { app } from '../src/index.js';

describe('Payment API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYMENT_WEBHOOK_SECRET = 'pay-webhook-secret';

    mockPrisma.$transaction.mockImplementation(async (handler: any) => handler(mockPrisma));

    mockPrisma.paymentEvent.create.mockResolvedValue({
      intentId: 'intent_1',
      paymentRef: 'pay_1',
      plan: 'PRO',
      provider: 'UPI',
      amountPaise: 14900,
      status: 'CREATED',
    });

    mockPrisma.paymentEvent.findFirst.mockResolvedValue({
      intentId: 'intent_1',
      paymentRef: 'pay_1',
      userId: 'user-1',
      plan: 'PRO',
      provider: 'UPI',
      amountPaise: 14900,
      status: 'CREATED',
      upiId: null,
    });

    mockPrisma.paymentEvent.update.mockResolvedValue({
      intentId: 'intent_1',
      paymentRef: 'pay_1',
      status: 'PENDING',
      amountPaise: 14900,
      upiId: 'test@upi',
      provider: 'UPI',
      plan: 'PRO',
      userId: 'user-1',
    });

    mockPrisma.paymentEvent.findUnique.mockResolvedValue({
      intentId: 'intent_1',
      paymentRef: 'pay_1',
      userId: 'user-1',
      plan: 'PRO',
      provider: 'UPI',
      amountPaise: 14900,
      status: 'PENDING',
    });

    mockPrisma.user.update.mockResolvedValue({ id: 'user-1', plan: 'PRO', planStatus: 'ACTIVE' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      plan: 'PRO',
      planStatus: 'ACTIVE',
      renewalAt: new Date('2026-03-31T00:00:00.000Z'),
      paymentProvider: 'UPI',
      paymentRef: 'pay_1',
    });
  });

  it('POST /api/payments/intents creates payment intent', async () => {
    const res = await request(app)
      .post('/api/payments/intents')
      .send({ plan: 'PRO', provider: 'UPI' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('intent.intentId');
    expect(res.body.intent).toHaveProperty('amountPaise', 14900);
  });

  it('POST /api/payments/upi/collect creates collect request', async () => {
    const res = await request(app)
      .post('/api/payments/upi/collect')
      .send({ intentId: 'intent_1', upiId: 'test@upi' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('collect.deepLink');
    expect(res.body.collect).toHaveProperty('status', 'PENDING');
  });

  it('POST /api/payments/webhook processes success idempotently via paymentRef', async () => {
    mockPrisma.paymentEvent.update.mockResolvedValue({
      intentId: 'intent_1',
      paymentRef: 'pay_1',
      status: 'SUCCESS',
      amountPaise: 14900,
      upiId: 'test@upi',
      provider: 'UPI',
      plan: 'PRO',
      userId: 'user-1',
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('x-payment-signature', 'pay-webhook-secret')
      .send({ paymentRef: 'pay_1', status: 'SUCCESS', provider: 'UPI' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('result.processed', true);
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it('GET /api/payments/me returns billing profile', async () => {
    const res = await request(app).get('/api/payments/me');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profile.plan', 'PRO');
    expect(res.body).toHaveProperty('profile.paymentProvider', 'UPI');
  });
});
