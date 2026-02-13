import { prisma, Status } from '@repo/db';
import { sendWhatsAppText } from './meta-whatsapp.service.js';

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4003';

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

  try {
    const response = await fetch(`${ANALYTICS_SERVICE_URL}/api/stats/internal/consistency?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: { 'x-internal-secret': secret },
    });

    if (!response.ok) return null;
    const body = (await response.json()) as { consistencyScore?: number };
    return typeof body.consistencyScore === 'number' ? body.consistencyScore : null;
  } catch {
    return null;
  }
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

export const runSilentWatchSweep = async (): Promise<{ alertsSent: number; usersChecked: number }> => {
  const watchMap = readParentWatchMap();
  const thresholdOverdue = Number(process.env.WHATSAPP_PARENT_OVERDUE_THRESHOLD || 5);
  const thresholdConsistency = Number(process.env.WHATSAPP_PARENT_CONSISTENCY_THRESHOLD || 50);

  let alertsSent = 0;
  const users = Object.keys(watchMap);

  for (const userId of users) {
    const parentNumbers = watchMap[userId] || [];
    if (parentNumbers.length === 0) continue;

    const [overdueCount, consistencyScore] = await Promise.all([
      getOverdueCount(userId),
      getConsistencyScore(userId),
    ]);

    const shouldAlertOverdue = overdueCount > thresholdOverdue;
    const shouldAlertConsistency = consistencyScore !== null && consistencyScore < thresholdConsistency;

    if (!shouldAlertOverdue && !shouldAlertConsistency) {
      continue;
    }

    const lines: string[] = ['Student progress alert:'];
    if (shouldAlertOverdue) {
      lines.push(`• Overdue tasks: ${overdueCount} (threshold ${thresholdOverdue})`);
    }
    if (shouldAlertConsistency && consistencyScore !== null) {
      lines.push(`• Consistency score: ${Math.round(consistencyScore)} (threshold ${thresholdConsistency})`);
    }
    lines.push('This is an automated silent-watch notification.');

    const message = lines.join('\n');

    for (const number of parentNumbers) {
      try {
        await sendWhatsAppText(number, message);
        alertsSent += 1;
      } catch (error) {
        console.warn(`[WhatsApp Silent Watch] Failed sending to ${number}:`, error);
      }
    }
  }

  return { alertsSent, usersChecked: users.length };
};
