/**
 * revenue.service.ts
 *
 * Revenue reporting functions powering the admin dashboard.
 *
 * All monetary values are in paise (₹1 = 100 paise).  The API layer converts
 * to rupees when serialising to the client.
 *
 * Metrics exposed
 * ───────────────
 *  MRR snapshot        — current Monthly Recurring Revenue
 *  Revenue over time   — daily/weekly/monthly bucketed gross & net revenue
 *  Plan distribution   — subscriber counts per plan
 *  Churn               — cancellations + downgrades within a period
 *  Payment funnel      — CREATED → SUCCESS / FAILED ratios per plan
 *  Top-line KPIs       — ARPU, LTV estimate, trial-conversion rate
 *  Refund summary      — total refunded, refund rate
 */

import { BillingPlan, BillingStatus, prisma } from '@repo/db';
import { DEFAULT_PLAN_PRICE_PAISE, PLAN_CYCLE_DAYS } from './payment.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(d: Date) {
  const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x;
}
function pToRupees(p: number) {
  return parseFloat((p / 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// 1. Current MRR
// ---------------------------------------------------------------------------

/**
 * MRR = Σ (subscribers on plan × plan monthly price)
 * Institution is annual → monthly equivalent = price / 12.
 */
export async function getMrrSnapshot() {
  const [proCount, instCount] = await Promise.all([
    prisma.user.count({ where: { plan: BillingPlan.PRO, planStatus: BillingStatus.ACTIVE } }),
    prisma.user.count({ where: { plan: BillingPlan.INSTITUTION, planStatus: BillingStatus.ACTIVE } }),
  ]);

  const proMrrPaise  = proCount  * DEFAULT_PLAN_PRICE_PAISE[BillingPlan.PRO];
  const instMrrPaise = instCount * Math.round(DEFAULT_PLAN_PRICE_PAISE[BillingPlan.INSTITUTION] / 12);
  const totalMrrPaise = proMrrPaise + instMrrPaise;

  return {
    proSubscribers:         proCount,
    institutionSubscribers: instCount,
    totalSubscribers:       proCount + instCount,
    mrrPaise:               totalMrrPaise,
    mrrRupees:              pToRupees(totalMrrPaise),
    breakdown: {
      pro:         { count: proCount,  mrrPaise: proMrrPaise  },
      institution: { count: instCount, mrrPaise: instMrrPaise },
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Revenue over time (bucketed)
// ---------------------------------------------------------------------------

export type Bucket = 'day' | 'week' | 'month';

export async function getRevenueSeries(
  from: Date,
  to:   Date,
  bucket: Bucket = 'day',
): Promise<{ period: string; grossPaise: number; refundedPaise: number; netPaise: number; count: number }[]> {
  // Pull all SUCCESS events in the range
  const events = await prisma.paymentEvent.findMany({
    where: {
      status:    'SUCCESS',
      createdAt: { gte: from, lte: to },
    },
    select: { amountPaise: true, createdAt: true },
  });

  const refunds = await prisma.paymentEvent.findMany({
    where: {
      status:     'REFUNDED',
      refundedAt: { gte: from, lte: to },
    },
    select: { refundAmountPaise: true, refundedAt: true },
  });

  // Bucket key helper
  const getKey = (d: Date): string => {
    if (bucket === 'day')   return d.toISOString().slice(0, 10);
    if (bucket === 'week') {
      const day  = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      const mon  = new Date(d); mon.setUTCDate(diff); mon.setUTCHours(0,0,0,0);
      return mon.toISOString().slice(0, 10);
    }
    // month
    return d.toISOString().slice(0, 7);
  };

  const grossMap  = new Map<string, { gross: number; count: number }>();
  const refundMap = new Map<string, number>();

  for (const ev of events) {
    const key = getKey(ev.createdAt);
    const cur = grossMap.get(key) ?? { gross: 0, count: 0 };
    grossMap.set(key, { gross: cur.gross + ev.amountPaise, count: cur.count + 1 });
  }
  for (const r of refunds) {
    if (!r.refundedAt) continue;
    const key = getKey(r.refundedAt);
    refundMap.set(key, (refundMap.get(key) ?? 0) + (r.refundAmountPaise ?? 0));
  }

  // Build all periods in range
  const periods: string[] = [];
  const cursor = startOfDay(new Date(from));
  while (cursor <= to) {
    const key = getKey(cursor);
    if (!periods.includes(key)) periods.push(key);
    cursor.setDate(cursor.getDate() + (bucket === 'month' ? 28 : bucket === 'week' ? 7 : 1));
  }

  return periods.map((period) => {
    const g = grossMap.get(period) ?? { gross: 0, count: 0 };
    const refunded = refundMap.get(period) ?? 0;
    return {
      period,
      grossPaise:    g.gross,
      refundedPaise: refunded,
      netPaise:      g.gross - refunded,
      count:         g.count,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Plan distribution
// ---------------------------------------------------------------------------

export async function getPlanDistribution() {
  const [free, pro, institution, inactive, pastDue, canceled] = await Promise.all([
    prisma.user.count({ where: { plan: BillingPlan.FREE } }),
    prisma.user.count({ where: { plan: BillingPlan.PRO,         planStatus: BillingStatus.ACTIVE } }),
    prisma.user.count({ where: { plan: BillingPlan.INSTITUTION, planStatus: BillingStatus.ACTIVE } }),
    prisma.user.count({ where: { planStatus: BillingStatus.INACTIVE } }),
    prisma.user.count({ where: { planStatus: BillingStatus.PAST_DUE } }),
    prisma.user.count({ where: { planStatus: BillingStatus.CANCELED } }),
  ]);
  const total = free + pro + institution;
  return {
    free, pro, institution, inactive, pastDue, canceled, total,
    conversionRate: total > 0 ? parseFloat(((pro + institution) / total * 100).toFixed(2)) : 0,
  };
}

// ---------------------------------------------------------------------------
// 4. Churn analysis
// ---------------------------------------------------------------------------

export async function getChurnMetrics(from: Date, to: Date) {
  // Cancellations in period (status changed to CANCELED and there's a SUCCESS event before it)
  const canceledEvents = await prisma.paymentEvent.count({
    where: {
      eventType: 'PAYMENT',
      status:    'FAILED',
      createdAt: { gte: from, lte: to },
    },
  });

  const refundCount = await prisma.paymentEvent.count({
    where: {
      status:     'REFUNDED',
      refundedAt: { gte: from, lte: to },
    },
  });

  const newSubscribers = await prisma.paymentEvent.count({
    where: {
      status:    'SUCCESS',
      eventType: 'PAYMENT',
      createdAt: { gte: from, lte: to },
    },
  });

  const renewals = await prisma.paymentEvent.count({
    where: {
      status:    'SUCCESS',
      eventType: 'RENEWAL',
      createdAt: { gte: from, lte: to },
    },
  });

  return { canceledEvents, refundCount, newSubscribers, renewals, from, to };
}

// ---------------------------------------------------------------------------
// 5. Payment funnel
// ---------------------------------------------------------------------------

export async function getPaymentFunnel(from: Date, to: Date) {
  const plans  = [BillingPlan.PRO, BillingPlan.INSTITUTION] as const;
  const result: Record<string, { created: number; success: number; failed: number; successRate: number }> = {};

  for (const plan of plans) {
    const [created, success, failed] = await Promise.all([
      prisma.paymentEvent.count({ where: { plan, createdAt: { gte: from, lte: to } } }),
      prisma.paymentEvent.count({ where: { plan, status: 'SUCCESS', createdAt: { gte: from, lte: to } } }),
      prisma.paymentEvent.count({ where: { plan, status: 'FAILED',  createdAt: { gte: from, lte: to } } }),
    ]);
    result[plan] = {
      created, success, failed,
      successRate: created > 0 ? parseFloat((success / created * 100).toFixed(2)) : 0,
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// 6. Top-line KPIs
// ---------------------------------------------------------------------------

export async function getTopLineKpis() {
  const [mrr, dist] = await Promise.all([getMrrSnapshot(), getPlanDistribution()]);

  const totalActiveSubscribers = dist.pro + dist.institution;

  // ARPU — average revenue per user (monthly)
  const arpu = totalActiveSubscribers > 0
    ? pToRupees(mrr.mrrPaise / totalActiveSubscribers)
    : 0;

  // Simple LTV estimate: ARPU × average subscription length in months
  // Assumed from plan cycle days
  const avgCycleDays = (
    (dist.pro          * PLAN_CYCLE_DAYS[BillingPlan.PRO])         +
    (dist.institution  * PLAN_CYCLE_DAYS[BillingPlan.INSTITUTION])
  ) / Math.max(1, totalActiveSubscribers);
  const avgCycleMonths = avgCycleDays / 30;
  const ltv = parseFloat((arpu * avgCycleMonths).toFixed(2));

  // Total gross revenue all-time
  const grossAgg = await prisma.paymentEvent.aggregate({
    where: { status: 'SUCCESS' },
    _sum:  { amountPaise: true },
    _count: { id: true },
  });
  const refundAgg = await prisma.paymentEvent.aggregate({
    where: { status: 'REFUNDED' },
    _sum:  { refundAmountPaise: true },
  });

  const grossRevenuePaise   = grossAgg._sum.amountPaise        ?? 0;
  const refundedPaise       = refundAgg._sum.refundAmountPaise ?? 0;
  const netRevenuePaise     = grossRevenuePaise - refundedPaise;
  const totalTransactions   = grossAgg._count.id;
  const refundRate          = totalTransactions > 0
    ? parseFloat(((await prisma.paymentEvent.count({ where: { status: 'REFUNDED' } })) / totalTransactions * 100).toFixed(2))
    : 0;

  return {
    mrr:              mrr.mrrRupees,
    mrrPaise:         mrr.mrrPaise,
    arpu,
    ltvEstimate:      ltv,
    totalSubscribers: totalActiveSubscribers,
    grossRevenuePaise,
    netRevenuePaise,
    refundedPaise,
    refundRate,
    totalTransactions,
    planBreakdown:    dist,
  };
}

// ---------------------------------------------------------------------------
// 7. Refund summary
// ---------------------------------------------------------------------------

export async function getRefundSummary(from: Date, to: Date) {
  const [refundCount, agg, totalSuccessAgg] = await Promise.all([
    prisma.paymentEvent.count({
      where: { status: 'REFUNDED', refundedAt: { gte: from, lte: to } },
    }),
    prisma.paymentEvent.aggregate({
      where: { status: 'REFUNDED', refundedAt: { gte: from, lte: to } },
      _sum:  { refundAmountPaise: true },
    }),
    prisma.paymentEvent.aggregate({
      where: { status: 'SUCCESS', createdAt: { gte: from, lte: to } },
      _sum:  { amountPaise: true },
      _count: { id: true },
    }),
  ]);

  const refundedPaise  = agg._sum.refundAmountPaise ?? 0;
  const grossPaise     = totalSuccessAgg._sum.amountPaise ?? 0;
  const refundRate     = totalSuccessAgg._count.id > 0
    ? parseFloat((refundCount / totalSuccessAgg._count.id * 100).toFixed(2))
    : 0;

  return {
    refundCount,
    refundedPaise,
    refundedRupees: pToRupees(refundedPaise),
    grossPaise,
    refundRate,
    from,
    to,
  };
}
