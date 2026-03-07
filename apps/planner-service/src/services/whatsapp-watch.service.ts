import { prisma, Status } from '@repo/db';
import crypto from 'crypto';
import { requestJson } from './internal-http.service.js';
import { sendWhatsAppText } from './meta-whatsapp.service.js';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4003';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

type ParentWatchMap = Record<string, string[]>;

const readParentWatchMap = (): ParentWatchMap => {
  const raw = process.env.WHATSAPP_PARENT_WATCH_MAP;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const normalized: ParentWatchMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      const phones = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (phones.length > 0) normalized[key] = phones;
    }
    return normalized;
  } catch {
    return {};
  }
};

const getConsistencyScore = async (userId: string): Promise<number | null> => {
  const secret = process.env.ANALYTICS_INTERNAL_SECRET;
  if (!secret) return null;

  const result = await requestJson<{ consistencyScore?: number }>({
    url: `${ANALYTICS_SERVICE_URL}/api/stats/internal/consistency?userId=${encodeURIComponent(userId)}`,
    headers: { 'x-internal-secret': secret },
    logContext: {
      service: 'planner-service',
      subsystem: 'whatsapp-watch',
      dependency: 'analytics-service',
      operation: 'fetch_consistency_score',
    },
  });

  if (!result.ok || !result.data) return null;
  return typeof result.data.consistencyScore === 'number' ? result.data.consistencyScore : null;
};

const getOverdueCount = async (userId: string): Promise<number> => {
  return prisma.task.count({
    where: {
      userId,
      status: { not: Status.COMPLETED },
      dueDate: { lt: new Date() },
    },
  });
};

const hashToken = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const generateOpaqueToken = (): string =>
  crypto.randomBytes(24).toString('base64url');

const createEphemeralFeedbackLink = async (userId: string, label: string | null): Promise<{ shareToken: string; linkId: string }> => {
  const shareToken = `fml_${generateOpaqueToken()}`;
  const tokenHash = hashToken(shareToken);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const link = await prisma.familyShareLink.create({
    data: {
      userId,
      tokenHash,
      label,
      permissions: 'FEEDBACK',
      expiresAt,
    },
    select: { id: true },
  });

  return { shareToken, linkId: link.id };
};

type WatchTarget = {
  source: 'subscription' | 'env';
  subscriptionId?: string;
  userId: string;
  label: string | null;
  recipientPhone: string;
  overdueThreshold: number;
  consistencyThreshold: number;
  cooldownMinutes: number;
  lastAlertAt: Date | null;
};

const loadWatchTargets = async (): Promise<WatchTarget[]> => {
  const thresholdOverdue = Number(process.env.WHATSAPP_PARENT_OVERDUE_THRESHOLD || 5);
  const thresholdConsistency = Number(process.env.WHATSAPP_PARENT_CONSISTENCY_THRESHOLD || 50);

  const targets: WatchTarget[] = [];

  // DB-backed subscriptions (productized path)
  const subscriptions = await prisma.mentorAlertSubscription.findMany({
    where: {
      enabled: true,
      revokedAt: null,
    },
    select: {
      id: true,
      userId: true,
      label: true,
      recipientPhone: true,
      overdueThreshold: true,
      consistencyThreshold: true,
      cooldownMinutes: true,
      lastAlertAt: true,
    },
  });

  for (const sub of subscriptions) {
    targets.push({
      source: 'subscription',
      subscriptionId: sub.id,
      userId: sub.userId,
      label: sub.label ?? null,
      recipientPhone: sub.recipientPhone,
      overdueThreshold: sub.overdueThreshold ?? thresholdOverdue,
      consistencyThreshold: sub.consistencyThreshold ?? thresholdConsistency,
      cooldownMinutes: sub.cooldownMinutes ?? 360,
      lastAlertAt: sub.lastAlertAt ?? null,
    });
  }

  // Backward-compatible env mapping (legacy)
  const watchMap = readParentWatchMap();
  for (const [userId, phones] of Object.entries(watchMap)) {
    for (const phone of phones) {
      targets.push({
        source: 'env',
        userId,
        label: null,
        recipientPhone: phone,
        overdueThreshold: thresholdOverdue,
        consistencyThreshold: thresholdConsistency,
        cooldownMinutes: 360,
        lastAlertAt: null,
      });
    }
  }

  return targets;
};

const isCoolingDown = (lastAlertAt: Date | null, cooldownMinutes: number): boolean => {
  if (!lastAlertAt) return false;
  const elapsedMs = Date.now() - lastAlertAt.getTime();
  return elapsedMs < Math.max(0, cooldownMinutes) * 60 * 1000;
};

export const runSilentWatchSweep = async (): Promise<{ alertsSent: number; usersChecked: number }> => {
  const targets = await loadWatchTargets();
  let alertsSent = 0;

  const uniqueUsersChecked = new Set<string>();

  for (const target of targets) {
    uniqueUsersChecked.add(target.userId);

    if (isCoolingDown(target.lastAlertAt, target.cooldownMinutes)) {
      continue;
    }

    const [overdueCount, consistencyScore] = await Promise.all([
      getOverdueCount(target.userId),
      getConsistencyScore(target.userId),
    ]);

    const shouldAlertOverdue = overdueCount > target.overdueThreshold;
    const shouldAlertConsistency = consistencyScore !== null && consistencyScore < target.consistencyThreshold;

    if (!shouldAlertOverdue && !shouldAlertConsistency) {
      continue;
    }

    const { shareToken, linkId } = await createEphemeralFeedbackLink(
      target.userId,
      target.label ? `Mentor alert: ${target.label}` : 'Mentor alert',
    );
    const shareUrl = `${FRONTEND_URL.replace(/\/$/, '')}/family-connect/accept/${shareToken}`;

    const lines: string[] = ['Student progress alert:'];
    const triggers: string[] = [];
    if (shouldAlertOverdue) {
      lines.push(`• Overdue tasks: ${overdueCount} (threshold ${target.overdueThreshold})`);
      triggers.push('OVERDUE');
    }
    if (shouldAlertConsistency && consistencyScore !== null) {
      lines.push(`• Consistency score: ${Math.round(consistencyScore)} (threshold ${target.consistencyThreshold})`);
      triggers.push('CONSISTENCY');
    }
    lines.push('');
    lines.push(`Open dashboard: ${shareUrl}`);
    lines.push('You can leave a note on the dashboard (Feedback).');
    lines.push('Automated silent-watch notification.');

    const message = lines.join('\n');

    try {
      await sendWhatsAppText(target.recipientPhone, message);
      alertsSent += 1;

      await prisma.mentorAlert.create({
        data: {
          userId: target.userId,
          subscriptionId: target.subscriptionId ?? null,
          shareLinkId: linkId,
          trigger: triggers.join(','),
          message,
          sentToPhone: target.recipientPhone,
          status: 'SENT',
        },
      });

      if (target.source === 'subscription' && target.subscriptionId) {
        await prisma.mentorAlertSubscription.update({
          where: { id: target.subscriptionId },
          data: { lastAlertAt: new Date() },
        });
      }
    } catch (error) {
      console.warn(`[WhatsApp Silent Watch] Failed sending to ${target.recipientPhone}:`, error);
      try {
        await prisma.mentorAlert.create({
          data: {
            userId: target.userId,
            subscriptionId: target.subscriptionId ?? null,
            shareLinkId: linkId,
            trigger: 'SEND_FAILED',
            message,
            sentToPhone: target.recipientPhone,
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'send_failed',
          },
        });
      } catch {
        // ignore
      }
    }
  }

  return { alertsSent, usersChecked: uniqueUsersChecked.size };
};
