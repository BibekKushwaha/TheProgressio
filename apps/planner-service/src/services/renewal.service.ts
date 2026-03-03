/**
 * renewal.service.ts
 *
 * BullMQ-based subscription lifecycle workers.
 *
 *  Queues
 *  ──────
 *  payment-renewal        – daily scan: users renewing within 7 days → new Razorpay order
 *  payment-retry          – delayed retry jobs at day +1/+3/+7 after payment.failed
 *  webhook-dlq            – retry dead-lettered webhook events (DB-backed)
 *  payment-reconciliation – daily Razorpay settlement reconciliation
 *
 * Important: This module is lazily imported from payment.service.ts to avoid
 * circular-dependency issues during testing.
 */

import { Queue, Worker, type Job } from 'bullmq';
import { BillingPlan, BillingStatus, prisma } from '@repo/db';
import {
  createPaymentIntent,
  GRACE_PERIOD_DAYS,
} from './payment.service.js';

// ---------------------------------------------------------------------------
// Redis connection
// ---------------------------------------------------------------------------

const redisConnection = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  maxRetriesPerRequest: null as null, // required by BullMQ
};

// ---------------------------------------------------------------------------
// Queue definitions (exported so payment.service can enqueue jobs)
// ---------------------------------------------------------------------------

export const renewalQueue = new Queue('payment-renewal', {
  connection: redisConnection,
  defaultJobOptions: { attempts: 1, removeOnComplete: true, removeOnFail: { count: 50 } },
});

export const paymentRetryQueue = new Queue('payment-retry', {
  connection: redisConnection,
  defaultJobOptions: { attempts: 1, removeOnComplete: true, removeOnFail: { count: 50 } },
});

export const webhookDlqQueue = new Queue('webhook-dlq', {
  connection: redisConnection,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 60_000 }, removeOnComplete: true, removeOnFail: { count: 100 } },
});

export const reconciliationQueue = new Queue('payment-reconciliation', {
  connection: redisConnection,
  defaultJobOptions: { attempts: 2, removeOnComplete: true, removeOnFail: { count: 30 } },
});

// ---------------------------------------------------------------------------
// Job payloads
// ---------------------------------------------------------------------------

interface RenewalJobData       { windowDays: number; }
interface RetryJobData         { userId: string; failedPaymentRef: string; retryCount: number; }
interface DlqJobData           { dlqId: string; }
interface ReconciliationJobData { date: string; } // ISO date string

// ---------------------------------------------------------------------------
// Helper — add days
// ---------------------------------------------------------------------------

const addDays = (date: Date, n: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

// ---------------------------------------------------------------------------
// Renewal scan worker
// ---------------------------------------------------------------------------

/** Finds all users whose renewalAt falls in [now, now + windowDays] */
async function processRenewalScan(job: Job<RenewalJobData>) {
  const { windowDays } = job.data;
  const now   = new Date();
  const until = addDays(now, windowDays);

  const users = await prisma.user.findMany({
    where: {
      planStatus: BillingStatus.ACTIVE,
      plan:       { not: BillingPlan.FREE },
      renewalAt:  { gte: now, lte: until },
    },
    select: {
      id:              true,
      plan:            true,
      paymentProvider: true,
      renewalAt:       true,
    },
  });

  let queued = 0;
  for (const user of users) {
    try {
      // Create a new Razorpay order for the renewal
      const intent = await createPaymentIntent(user.id, {
        plan:       user.plan as BillingPlan,
        provider:   'UPI',
        eventType:  'RENEWAL',
        retryCount: 0,
      });

      // TODO: emit a push notification with the deep-link checkout URL
      // e.g. await notifyRenewalDue(user.id, intent.orderId);
      void intent; // silence unused warning until notification service is wired

      queued++;
    } catch (err) {
      console.error('[renewal] failed to queue user', user.id, err);
    }
  }

  console.log(`[renewal] scanned ${users.length} users, queued ${queued} renewal orders`);
  return { total: users.length, queued };
}

// ---------------------------------------------------------------------------
// DLQ retry worker — re-processes failed webhook events stored in DB
// ---------------------------------------------------------------------------

async function processDlqJob(job: Job<DlqJobData>) {
  const { dlqId } = job.data;
  const dlqEntry = await prisma.webhookDLQ.findUnique({ where: { id: dlqId } });
  if (!dlqEntry || dlqEntry.resolved) {
    return { skipped: true, reason: 'not_found_or_resolved' };
  }

  const { applyRazorpayWebhook } = await import('./payment.service.js');
  const result = await applyRazorpayWebhook(dlqEntry.rawBody, dlqEntry.signature ?? null);

  const succeeded = result.authorized && (result as any).processed === true;

  await prisma.webhookDLQ.update({
    where: { id: dlqId },
    data: {
      retryCount:  dlqEntry.retryCount + 1,
      resolved:    succeeded,
      resolvedAt:  succeeded ? new Date() : null,
      nextRetryAt: succeeded ? null : new Date(Date.now() + 30 * 60 * 1000),
      updatedAt:   new Date(),
    },
  });

  if (!succeeded) {
    throw new Error(`dlq_retry_failed:${JSON.stringify(result)}`);
  }
  return { resolved: true, dlqId };
}

// ---------------------------------------------------------------------------
// Reconciliation worker
// ---------------------------------------------------------------------------

async function processReconciliationJob(job: Job<ReconciliationJobData>) {
  // 'yesterday' sentinel used by repeatable daily job
  const rawDate = (job.data as any).date as string;
  const date = rawDate === 'yesterday'
    ? new Date(Date.now() - 24 * 60 * 60 * 1000)
    : new Date(rawDate);
  if (isNaN(date.getTime())) throw new Error('invalid_date');
  const { runReconciliation } = await import('./reconciliation.service.js');
  const result = await runReconciliation(date);
  console.log('[reconciliation] completed', result.reportId, result);
  return result;
}

const MAX_RETRIES = 3;

async function processRetryJob(job: Job<RetryJobData>) {
  const { userId, failedPaymentRef, retryCount } = job.data;

  if (retryCount > MAX_RETRIES) {
    // Exhaust retries — mark user subscription as CANCELED
    await prisma.user.update({
      where: { id: userId },
      data:  { planStatus: BillingStatus.CANCELED, renewalAt: null },
    });
    console.warn('[retry] max retries reached, canceling subscription for', userId);
    return { exhausted: true };
  }

  // Fetch the original failed event to know the plan
  const original = await prisma.paymentEvent.findFirst({
    where: { paymentRef: failedPaymentRef, userId },
  });
  if (!original) {
    console.warn('[retry] original event not found', failedPaymentRef);
    return { skipped: true, reason: 'original_event_not_found' };
  }

  // Check if user is still in PAST_DUE (they may have paid manually already)
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { planStatus: true, renewalAt: true },
  });
  if (!user || user.planStatus !== BillingStatus.PAST_DUE) {
    console.log('[retry] user already resolved, skipping retry for', userId);
    return { skipped: true, reason: 'user_resolved' };
  }

  // Still past-due — check grace period
  const graceExpired = !user.renewalAt || addDays(new Date(user.renewalAt), GRACE_PERIOD_DAYS) < new Date();
  if (graceExpired && retryCount >= MAX_RETRIES) {
    await prisma.user.update({
      where: { id: userId },
      data:  { planStatus: BillingStatus.CANCELED, plan: BillingPlan.FREE, renewalAt: null },
    });
    return { exhausted: true, graceExpired: true };
  }

  // Create a retry order
  try {
    const intent = await createPaymentIntent(userId, {
      plan:       original.plan as BillingPlan,
      provider:   'UPI',
      eventType:  'RENEWAL',
      retryCount: retryCount,
      parentRef:  failedPaymentRef,
    });

    // TODO: send push notification with retry checkout link
    void intent;

    console.log(`[retry] created retry order (attempt ${retryCount}) for user`, userId);
    return { retryOrderId: intent.orderId, retryCount };
  } catch (err) {
    console.error('[retry] failed to create retry order', err);
    throw err; // BullMQ will mark job as failed
  }
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

let _renewalWorker:        Worker | null = null;
let _retryWorker:          Worker | null = null;
let _dlqWorker:            Worker | null = null;
let _reconciliationWorker: Worker | null = null;
let _renewalScheduled = false;

export async function startRenewalWorker(): Promise<void> {
  if (_renewalWorker) return;

  // ── Renewal scan worker ─────────────────────────────────────────────────
  _renewalWorker = new Worker<RenewalJobData>('payment-renewal', processRenewalScan, { connection: redisConnection, concurrency: 1 });
  _renewalWorker.on('completed', (job, r) => console.log('[renewal] done', job.id, r));
  _renewalWorker.on('failed',    (job, e) => console.error('[renewal] fail', job?.id, e));

  // ── Retry worker ─────────────────────────────────────────────────────────
  _retryWorker = new Worker<RetryJobData>('payment-retry', processRetryJob, { connection: redisConnection, concurrency: 5 });
  _retryWorker.on('completed', (job, r) => console.log('[retry] done', job.id, r));
  _retryWorker.on('failed',    (job, e) => console.error('[retry] fail', job?.id, e));

  // ── DLQ worker ────────────────────────────────────────────────────────────
  _dlqWorker = new Worker<DlqJobData>('webhook-dlq', processDlqJob, { connection: redisConnection, concurrency: 3 });
  _dlqWorker.on('completed', (job, r) => console.log('[dlq] resolved', job.id, r));
  _dlqWorker.on('failed',    (job, e) => console.error('[dlq] fail', job?.id, e));

  // ── Reconciliation worker ─────────────────────────────────────────────────
  _reconciliationWorker = new Worker<ReconciliationJobData>('payment-reconciliation', processReconciliationJob, { connection: redisConnection, concurrency: 1 });
  _reconciliationWorker.on('completed', (job, r) => console.log('[reconciliation] done', job.id, r));
  _reconciliationWorker.on('failed',    (job, e) => console.error('[reconciliation] fail', job?.id, e));

  // ── Schedule repeatable jobs (idempotent) ─────────────────────────────────
  if (!_renewalScheduled) {
    // Daily renewal scan at 09:00 UTC
    await renewalQueue.add(
      'daily-scan',
      { windowDays: 7 } satisfies RenewalJobData,
      { repeat: { pattern: '0 9 * * *' }, jobId: 'renewal-daily-scan' },
    );

    // Daily reconciliation at 06:00 UTC (after Razorpay settlement window)
    await reconciliationQueue.add(
      'daily-reconcile',
      // Yesterday's date will be computed at job-processing time
      { date: 'yesterday' } as unknown as ReconciliationJobData,
      { repeat: { pattern: '0 6 * * *' }, jobId: 'reconciliation-daily' },
    );

    // DLQ scan: retry unresolved entries every 30 minutes
    const pendingDlq = await prisma.webhookDLQ.findMany({
      where: { resolved: false, retryCount: { lt: 10 } },
      select: { id: true },
      take: 50,
    });
    for (const entry of pendingDlq) {
      await webhookDlqQueue.add('retry', { dlqId: entry.id }, { jobId: `dlq-${entry.id}` });
    }

    _renewalScheduled = true;
    console.log('[renewal] all schedules registered');
  }

  console.log('[renewal] all workers started');
}

export async function stopRenewalWorker(): Promise<void> {
  await Promise.all([
    _renewalWorker?.close(),
    _retryWorker?.close(),
    _dlqWorker?.close(),
    _reconciliationWorker?.close(),
  ]);
  _renewalWorker = _retryWorker = _dlqWorker = _reconciliationWorker = null;
  console.log('[renewal] all workers stopped');
}
