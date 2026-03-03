/**
 * Revenue & Admin dashboard routes.
 *
 * All routes are admin-only (isAuth + isAdmin).
 * Mount at /api/revenue in index.ts.
 */
import express from 'express';
import {
  isAuth,
  isAdmin,
  adminRateLimit,
  requireAdminIp,
} from '../middleware/auth.middleware.js';
import {
  getKpisHandler,
  getMrrHandler,
  getRevenueSeriesHandler,
  getPlanDistributionHandler,
  getChurnHandler,
  getFunnelHandler,
  getRefundSummaryHandler,
  listReconciliationHandler,
  getReconciliationHandler,
  triggerReconciliationHandler,
  listFraudFlagsHandler,
  resolveFraudHandler,
  blockUserFraudHandler,
  listPaymentEventsHandler,
} from '../controllers/revenue.controller.js';

const router = express.Router();

/**
 * Full admin guard chain applied to every route in this file:
 *   1. isAuth         — must be a valid JWT session
 *   2. isAdmin        — role must be "ADMIN"
 *   3. adminRateLimit — 60 req / 15 min per user/IP
 *   4. requireAdminIp — optional ADMIN_IP_ALLOWLIST env var
 */
const adminGuard = [isAuth, isAdmin, adminRateLimit, requireAdminIp] as const;

// ── Top-line KPIs ────────────────────────────────────────────────────────────
router.get('/kpis',         ...adminGuard, getKpisHandler);
router.get('/mrr',          ...adminGuard, getMrrHandler);
router.get('/series',       ...adminGuard, getRevenueSeriesHandler);   // ?from=&to=&bucket=
router.get('/plans',        ...adminGuard, getPlanDistributionHandler);
router.get('/churn',        ...adminGuard, getChurnHandler);           // ?from=&to=
router.get('/funnel',       ...adminGuard, getFunnelHandler);          // ?from=&to=
router.get('/refunds',      ...adminGuard, getRefundSummaryHandler);   // ?from=&to=

// ── Reconciliation ───────────────────────────────────────────────────────────
router.get('/reconciliation',       ...adminGuard, listReconciliationHandler);    // ?days=
router.get('/reconciliation/:date', ...adminGuard, getReconciliationHandler);     // :date = YYYY-MM-DD
router.post('/reconciliation',      ...adminGuard, triggerReconciliationHandler); // { date? }

// ── Fraud ────────────────────────────────────────────────────────────────────
router.get('/fraud',                    ...adminGuard, listFraudFlagsHandler);    // ?risk=
router.post('/fraud/:userId/resolve',   ...adminGuard, resolveFraudHandler);
router.post('/fraud/:userId/block',     ...adminGuard, blockUserFraudHandler);

// ── Raw event log ────────────────────────────────────────────────────────────
router.get('/events', ...adminGuard, listPaymentEventsHandler); // ?page=&limit=&status=&plan=

export default router;
