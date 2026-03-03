/**
 * reconciliation.service.ts
 *
 * Daily reconciliation of local PaymentEvent records against Razorpay's
 * payment/settlement API.
 *
 * Flow
 * ────
 *  1. For a given date, fetch all Razorpay payments whose `created_at` falls
 *     within [start_of_day, end_of_day] (paged via `from`/`to` params).
 *  2. Compare against local DB rows with status='SUCCESS' for the same window.
 *  3. Detect three discrepancy classes:
 *       missingInDb  — Razorpay says captured, DB has no matching row
 *       missingInRzp — DB says SUCCESS,        Razorpay has no matching row
 *       amountMismatch — Both have it,          but amounts differ
 *  4. Write a ReconciliationReport row with the findings.
 *  5. Scheduled daily via BullMQ (called from renewal.service startRenewalWorker).
 */

import { prisma } from '@repo/db';
import { getRazorpay } from './payment.service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RzpPayment {
  id:         string;
  order_id:   string;
  amount:     number;
  currency:   string;
  status:     string;
  captured:   boolean;
  created_at: number;  // unix timestamp
}

interface AmountMismatch {
  paymentRef:  string;
  rzpPaymentId: string;
  dbAmount:    number;
  rzpAmount:   number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ---------------------------------------------------------------------------
// Razorpay payment list — paged
// ---------------------------------------------------------------------------

async function fetchRzpPaymentsForDate(date: Date): Promise<RzpPayment[]> {
  const rzp = getRazorpay();
  const from = Math.floor(startOfDay(date).getTime() / 1000);
  const to   = Math.floor(endOfDay(date).getTime()   / 1000);

  const collected: RzpPayment[] = [];
  let skip   = 0;
  const count = 100;

  while (true) {
    const response = await (rzp.payments as any).all({
      from,
      to,
      count,
      skip,
    }) as { items?: RzpPayment[]; count?: number };

    const items = response.items ?? [];
    collected.push(...items);

    if (items.length < count) break; // last page
    skip += count;

    // Safety guard: Razorpay API limit
    if (skip >= 10_000) break;
  }

  // Only keep captured payments in INR
  return collected.filter((p) => p.status === 'captured' && p.currency === 'INR');
}

// ---------------------------------------------------------------------------
// Core reconciliation
// ---------------------------------------------------------------------------

export async function runReconciliation(date: Date): Promise<{
  reportId:      string;
  matched:       number;
  missingInDb:   string[];
  missingInRzp:  string[];
  amountMismatches: AmountMismatch[];
  totalRevenuePaise: number;
  refundedPaise: number;
  netRevenuePaise: number;
}> {
  const reportDate = startOfDay(date);

  // Upsert report row (idempotent — re-running the same date overwrites)
  const report = await prisma.reconciliationReport.upsert({
    where:  { reportDate },
    create: { reportDate, status: 'RUNNING' },
    update: { status: 'RUNNING', errorMsg: null, updatedAt: new Date() },
  });

  try {
    // ── 1. Fetch from Razorpay ─────────────────────────────────────────────
    const rzpPayments = await fetchRzpPaymentsForDate(date);
    const rzpMap = new Map<string, RzpPayment>(); // order_id → payment
    for (const p of rzpPayments) {
      if (p.order_id) rzpMap.set(p.order_id, p);
    }

    // ── 2. Fetch from DB ───────────────────────────────────────────────────
    const dbEvents = await prisma.paymentEvent.findMany({
      where: {
        status:    'SUCCESS',
        createdAt: { gte: startOfDay(date), lte: endOfDay(date) },
      },
      select: {
        paymentRef:  true,
        amountPaise: true,
        payload:     true,
      },
    });

    // Build DB map: order_id → {amountPaise, razorpayPaymentId}
    const dbMap = new Map<string, { amountPaise: number; rzpPaymentId?: string }>();
    for (const ev of dbEvents) {
      let rzpPaymentId: string | undefined;
      try {
        const parsed = JSON.parse(ev.payload ?? '{}');
        if (typeof parsed.razorpayPaymentId === 'string') rzpPaymentId = parsed.razorpayPaymentId;
      } catch { /* ignore */ }
      dbMap.set(ev.paymentRef, {
        amountPaise: ev.amountPaise,
        ...(rzpPaymentId ? { rzpPaymentId } : {}),
      });
    }

    // ── 3. Diff ────────────────────────────────────────────────────────────
    const missingInDb:    string[]          = [];
    const amountMismatches: AmountMismatch[] = [];

    for (const [orderId, rzpPmt] of rzpMap) {
      const dbEntry = dbMap.get(orderId);
      if (!dbEntry) {
        missingInDb.push(orderId);
        continue;
      }
      if (dbEntry.amountPaise !== rzpPmt.amount) {
        amountMismatches.push({
          paymentRef:   orderId,
          rzpPaymentId: rzpPmt.id,
          dbAmount:     dbEntry.amountPaise,
          rzpAmount:    rzpPmt.amount,
        });
      }
    }

    const missingInRzp: string[] = [];
    for (const orderId of dbMap.keys()) {
      if (!rzpMap.has(orderId)) missingInRzp.push(orderId);
    }

    const matched = dbEvents.length - missingInRzp.length - amountMismatches.length;

    // ── 4. Revenue totals ─────────────────────────────────────────────────
    const totalRevenuePaise = rzpPayments.reduce((sum, p) => sum + p.amount, 0);

    const refundedPaise = await prisma.paymentEvent.aggregate({
      where: {
        status:     'REFUNDED',
        refundedAt: { gte: startOfDay(date), lte: endOfDay(date) },
      },
      _sum: { refundAmountPaise: true },
    }).then((r) => r._sum.refundAmountPaise ?? 0);

    const netRevenuePaise = totalRevenuePaise - refundedPaise;

    // ── 5. Persist report ─────────────────────────────────────────────────
    await prisma.reconciliationReport.update({
      where: { id: report.id },
      data: {
        status:             'COMPLETED',
        rzpTotalCount:      rzpMap.size,
        dbTotalCount:       dbEvents.length,
        matchedCount:       Math.max(0, matched),
        missingInDb:        JSON.stringify(missingInDb),
        missingInRzp:       JSON.stringify(missingInRzp),
        amountMismatches:   JSON.stringify(amountMismatches),
        totalRevenuePaise,
        refundedPaise,
        netRevenuePaise,
        runAt:              new Date(),
        updatedAt:          new Date(),
      },
    });

    return {
      reportId: report.id,
      matched:  Math.max(0, matched),
      missingInDb,
      missingInRzp,
      amountMismatches,
      totalRevenuePaise,
      refundedPaise,
      netRevenuePaise,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.reconciliationReport.update({
      where:  { id: report.id },
      data:   { status: 'FAILED', errorMsg: msg, updatedAt: new Date() },
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Fetch latest reports (for admin dashboard)
// ---------------------------------------------------------------------------

export async function listReconciliationReports(days = 30) {
  return prisma.reconciliationReport.findMany({
    orderBy: { reportDate: 'desc' },
    take:    days,
  });
}

export async function getReconciliationReport(reportDate: Date) {
  return prisma.reconciliationReport.findUnique({
    where: { reportDate: startOfDay(reportDate) },
  });
}
