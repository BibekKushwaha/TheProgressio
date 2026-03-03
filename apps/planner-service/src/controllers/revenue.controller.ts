import type { Response } from 'express';
import { prisma } from '@repo/db';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  getMrrSnapshot,
  getRevenueSeries,
  getPlanDistribution,
  getChurnMetrics,
  getPaymentFunnel,
  getTopLineKpis,
  getRefundSummary,
  type Bucket,
} from '../services/revenue.service.js';
import {
  listReconciliationReports,
  getReconciliationReport,
  runReconciliation,
} from '../services/reconciliation.service.js';
import { listOpenFraudFlags, resolveFraudFlags, blockUser } from '../services/fraud.service.js';
import { TryCatch } from '../utils/tryCatch.js';
import ErrorHandler from '../utils/errorHandler.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDateParam(val: unknown, fallback: Date): Date {
  if (typeof val !== 'string' || !val) return fallback;
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : d;
}

// ---------------------------------------------------------------------------
// GET /api/revenue/kpis
// ---------------------------------------------------------------------------

export const getKpisHandler = TryCatch(async (_req: AuthenticatedRequest, res: Response) => {
  const kpis = await getTopLineKpis();
  return res.json(kpis);
});

// ---------------------------------------------------------------------------
// GET /api/revenue/mrr
// ---------------------------------------------------------------------------

export const getMrrHandler = TryCatch(async (_req: AuthenticatedRequest, res: Response) => {
  const mrr = await getMrrSnapshot();
  return res.json(mrr);
});

// ---------------------------------------------------------------------------
// GET /api/revenue/series?from=&to=&bucket=day|week|month
// ---------------------------------------------------------------------------

export const getRevenueSeriesHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const to   = parseDateParam(req.query['to'],   new Date());
  const from = parseDateParam(req.query['from'],  new Date(Date.now() - 30 * 86400000));
  const bucket = (['day', 'week', 'month'].includes(req.query['bucket'] as string)
    ? req.query['bucket']
    : 'day') as Bucket;

  const series = await getRevenueSeries(from, to, bucket);
  return res.json({ series, from, to, bucket });
});

// ---------------------------------------------------------------------------
// GET /api/revenue/plans
// ---------------------------------------------------------------------------

export const getPlanDistributionHandler = TryCatch(async (_req: AuthenticatedRequest, res: Response) => {
  const dist = await getPlanDistribution();
  return res.json(dist);
});

// ---------------------------------------------------------------------------
// GET /api/revenue/churn?from=&to=
// ---------------------------------------------------------------------------

export const getChurnHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const to   = parseDateParam(req.query['to'],   new Date());
  const from = parseDateParam(req.query['from'],  new Date(Date.now() - 30 * 86400000));
  const data = await getChurnMetrics(from, to);
  return res.json(data);
});

// ---------------------------------------------------------------------------
// GET /api/revenue/funnel?from=&to=
// ---------------------------------------------------------------------------

export const getFunnelHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const to   = parseDateParam(req.query['to'],   new Date());
  const from = parseDateParam(req.query['from'],  new Date(Date.now() - 30 * 86400000));
  const data = await getPaymentFunnel(from, to);
  return res.json(data);
});

// ---------------------------------------------------------------------------
// GET /api/revenue/refunds?from=&to=
// ---------------------------------------------------------------------------

export const getRefundSummaryHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const to   = parseDateParam(req.query['to'],   new Date());
  const from = parseDateParam(req.query['from'],  new Date(Date.now() - 30 * 86400000));
  const data = await getRefundSummary(from, to);
  return res.json(data);
});

// ---------------------------------------------------------------------------
// Reconciliation endpoints
// ---------------------------------------------------------------------------

// GET /api/revenue/reconciliation?days=30
export const listReconciliationHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const days = parseInt(String(req.query['days'] ?? '30'), 10);
  const reports = await listReconciliationReports(Math.min(days, 90));
  return res.json({ reports });
});

// GET /api/revenue/reconciliation/:date   (e.g. 2026-03-01)
export const getReconciliationHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const rawDate = String(req.params['date'] ?? '');
  const date = new Date(rawDate);
  if (isNaN(date.getTime())) throw new ErrorHandler(400, 'Invalid date');
  const report = await getReconciliationReport(date);
  if (!report) throw new ErrorHandler(404, 'Report not found');
  return res.json(report);
});

// POST /api/revenue/reconciliation  — trigger ad-hoc run
export const triggerReconciliationHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const date = parseDateParam(req.body?.date, new Date(Date.now() - 86400000)); // default: yesterday
  const result = await runReconciliation(date);
  return res.status(202).json(result);
});

// ---------------------------------------------------------------------------
// Fraud endpoints
// ---------------------------------------------------------------------------

// GET /api/revenue/fraud?risk=HIGH
export const listFraudFlagsHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const risk = req.query['risk'] as string | undefined;
  const validRisks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const flags = await listOpenFraudFlags(
    risk && validRisks.includes(risk) ? risk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' : undefined,
  );
  return res.json({ flags, total: flags.length });
});

// POST /api/revenue/fraud/:userId/resolve
export const resolveFraudHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params as { userId: string };
  if (!userId) throw new ErrorHandler(400, 'userId required');
  await resolveFraudFlags(userId, req.user!.id);
  return res.json({ resolved: true, userId });
});

// POST /api/revenue/fraud/:userId/block
export const blockUserFraudHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params as { userId: string };
  if (!userId) throw new ErrorHandler(400, 'userId required');
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'blocked_by_admin';
  await blockUser(userId, reason, req.user!.id);
  return res.json({ blocked: true, userId });
});

// ---------------------------------------------------------------------------
// GET /api/revenue/events — raw payment event log (admin)
// ---------------------------------------------------------------------------

export const listPaymentEventsHandler = TryCatch(async (req: AuthenticatedRequest, res: Response) => {
  const page   = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
  const limit  = Math.min(100, parseInt(String(req.query['limit'] ?? '50'), 10));
  const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
  const plan   = typeof req.query['plan']   === 'string' ? req.query['plan']   : undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(plan   ? { plan: plan as never } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.paymentEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id: true, intentId: true, paymentRef: true, plan: true,
        provider: true, amountPaise: true, status: true, eventType: true,
        retryCount: true, refundId: true, refundAmountPaise: true,
        createdAt: true, userId: true,
      },
    }),
    prisma.paymentEvent.count({ where }),
  ]);

  return res.json({ events, total, page, limit, pages: Math.ceil(total / limit) });
});
