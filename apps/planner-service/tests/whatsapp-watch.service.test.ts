import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => {
  const prisma = {
    mentorAlertSubscription: {
      findMany: vi.fn(async () => []),
      update: vi.fn(async () => ({})),
    },
    task: {
      count: vi.fn(async () => 0),
    },
    familyShareLink: {
      create: vi.fn(async () => ({ id: 'link-1' })),
    },
    mentorAlert: {
      create: vi.fn(async () => ({})),
    },
  };

  return { mockPrisma: prisma };
});

vi.mock('@repo/db', () => ({
  prisma: mockPrisma,
  Status: {
    COMPLETED: 'COMPLETED',
  },
}));

const { sendWhatsAppText } = vi.hoisted(() => ({
  sendWhatsAppText: vi.fn(async () => ({})),
}));

vi.mock('../src/services/meta-whatsapp.service.js', () => ({
  sendWhatsAppText,
}));

import { runSilentWatchSweep } from '../src/services/whatsapp-watch.service.js';

describe('whatsapp-watch.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.WHATSAPP_PARENT_WATCH_MAP;
    delete process.env.ANALYTICS_INTERNAL_SECRET;
  });

  it('sends an alert for overdue threshold and updates lastAlertAt', async () => {
    mockPrisma.mentorAlertSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-1',
        userId: 'user-1',
        label: 'Mom',
        recipientPhone: '+911234567890',
        overdueThreshold: 5,
        consistencyThreshold: 50,
        cooldownMinutes: 0,
        lastAlertAt: null,
      },
    ]);

    mockPrisma.task.count.mockResolvedValueOnce(6);

    const result = await runSilentWatchSweep();

    expect(result.alertsSent).toBe(1);
    expect(result.usersChecked).toBe(1);
    expect(sendWhatsAppText).toHaveBeenCalledTimes(1);
    const sentMessage = sendWhatsAppText.mock.calls[0]?.[1] as string;
    expect(sentMessage).toContain('Overdue tasks: 6');
    expect(sentMessage).toContain('/family-connect/accept/fml_');
    expect(mockPrisma.mentorAlertSubscription.update).toHaveBeenCalled();
    expect(mockPrisma.mentorAlert.create).toHaveBeenCalled();
  });

  it('skips sending during cooldown window', async () => {
    mockPrisma.mentorAlertSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-1',
        userId: 'user-1',
        label: null,
        recipientPhone: '+911234567890',
        overdueThreshold: 1,
        consistencyThreshold: 50,
        cooldownMinutes: 999,
        lastAlertAt: new Date(),
      },
    ]);

    mockPrisma.task.count.mockResolvedValueOnce(100);

    const result = await runSilentWatchSweep();

    expect(result.alertsSent).toBe(0);
    expect(sendWhatsAppText).not.toHaveBeenCalled();
  });

  it('uses analytics consistency when the internal secret is configured', async () => {
    process.env.ANALYTICS_INTERNAL_SECRET = 'analytics-secret';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ consistencyScore: 20 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    mockPrisma.mentorAlertSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-2',
        userId: 'user-2',
        label: 'Dad',
        recipientPhone: '+911234567891',
        overdueThreshold: 99,
        consistencyThreshold: 50,
        cooldownMinutes: 0,
        lastAlertAt: null,
      },
    ]);

    mockPrisma.task.count.mockResolvedValueOnce(0);

    const result = await runSilentWatchSweep();

    expect(result.alertsSent).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/stats/internal/consistency?userId=user-2'),
      expect.objectContaining({
        method: 'GET',
        headers: { 'x-internal-secret': 'analytics-secret' },
      }),
    );
    expect(sendWhatsAppText).toHaveBeenCalledTimes(1);
  });
});
