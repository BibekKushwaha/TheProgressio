/**
 * fraud.service.ts
 *
 * Anti-fraud heuristics for the payment pipeline.
 *
 * Heuristics implemented
 * ──────────────────────
 *  1. VELOCITY      — too many payment attempts in a rolling window
 *  2. DUPLICATE_INSTRUMENT — same VPA/card fingerprint used across ≥2 accounts
 *  3. CROSS_ACCOUNT  — same IP triggering payments on multiple distinct accounts
 *  4. SUSPICIOUS_AMOUNT — amount doesn't match any known plan price
 *  5. RAPID_PLAN_SWITCH — multiple plan changes within a short period
 *
 * Each check writes a FraudFlag row on first detection.  If risk reaches HIGH
 * or CRITICAL the user's fraudRisk field is escalated and further payments are
 * blocked until an admin resolves the flags.
 *
 * NOTE: IP tracking is opt-in.  Pass `ip` when available; omit to skip the
 * cross-account IP check.
 */

import { prisma } from '@repo/db';
import type { BillingPlan } from '@repo/db';
import { DEFAULT_PLAN_PRICE_PAISE } from './payment.service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FraudRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'BLOCKED';
export type FraudFlagType =
  | 'VELOCITY'
  | 'DUPLICATE_INSTRUMENT'
  | 'CROSS_ACCOUNT'
  | 'SUSPICIOUS_AMOUNT'
  | 'RAPID_PLAN_SWITCH';

export interface FraudCheckInput {
  userId:     string;
  plan:       BillingPlan;
  amountPaise: number;
  /** Razorpay VPA (UPI ID) or card fingerprint — present after payment is captured */
  instrument?: string;
  /** Client IP — used for cross-account detection */
  ip?:         string;
  paymentRef?: string;
}

export interface FraudCheckResult {
  blocked: boolean;
  risk:    FraudRisk | 'NONE';
  flags:   FraudFlagType[];
  reason?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Max payment-attempt events per user in the last N minutes before VELOCITY flag */
const VELOCITY_WINDOW_MINUTES  = 60;
const VELOCITY_MAX_ATTEMPTS     = 5;
const VELOCITY_CRITICAL_ATTEMPTS = 10;

const RAPID_SWITCH_WINDOW_DAYS  = 3;
const RAPID_SWITCH_MAX_CHANGES  = 3;

const IP_MAX_ACCOUNTS           = 3;  // Distinct user IDs per IP in last 24 h

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function flagUser(
  userId: string,
  type: FraudFlagType,
  risk: FraudRisk,
  details: Record<string, unknown>,
  paymentRef?: string,
): Promise<void> {
  // Write flag and escalate user's fraudRisk if necessary
  const riskOrder: Record<string, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4, BLOCKED: 5 };

  await prisma.$transaction(async (tx) => {
    await tx.fraudFlag.create({
      data: {
        userId,
        type,
        risk,
        details:    JSON.stringify(details),
        paymentRef: paymentRef ?? null,
      },
    });

    // Only escalate, never reduce (resolution is manual via admin)
    const user = await tx.user.findUnique({ where: { id: userId }, select: { fraudRisk: true } });
    const currentOrder = riskOrder[user?.fraudRisk ?? 'NONE'] ?? 0;
    const newOrder     = riskOrder[risk] ?? 0;
    if (newOrder > currentOrder) {
      await tx.user.update({
        where: { id: userId },
        data:  { fraudRisk: risk },
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Check 1 — Velocity
// ---------------------------------------------------------------------------

async function checkVelocity(userId: string, paymentRef?: string): Promise<FraudFlagType | null> {
  const since = new Date(Date.now() - VELOCITY_WINDOW_MINUTES * 60 * 1000);
  const count = await prisma.paymentEvent.count({
    where: { userId, createdAt: { gte: since } },
  });

  if (count >= VELOCITY_CRITICAL_ATTEMPTS) {
    await flagUser(userId, 'VELOCITY', 'CRITICAL', { attempts: count, windowMinutes: VELOCITY_WINDOW_MINUTES }, paymentRef);
    return 'VELOCITY';
  }
  if (count >= VELOCITY_MAX_ATTEMPTS) {
    await flagUser(userId, 'VELOCITY', 'HIGH', { attempts: count, windowMinutes: VELOCITY_WINDOW_MINUTES }, paymentRef);
    return 'VELOCITY';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Check 2 — Suspicious Amount
// ---------------------------------------------------------------------------

async function checkSuspiciousAmount(
  userId: string,
  amountPaise: number,
  plan: BillingPlan,
  paymentRef?: string,
): Promise<FraudFlagType | null> {
  const expected = DEFAULT_PLAN_PRICE_PAISE[plan];
  if (expected === 0) return null; // FREE plan — no payment expected

  // Allow up to ₹100 deviation (proration rounding)
  if (Math.abs(amountPaise - expected) > 10000) {
    await flagUser(
      userId,
      'SUSPICIOUS_AMOUNT',
      'HIGH',
      { amountPaise, expectedPaise: expected, plan },
      paymentRef,
    );
    return 'SUSPICIOUS_AMOUNT';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Check 3 — Duplicate Instrument across accounts
// ---------------------------------------------------------------------------

async function checkDuplicateInstrument(
  userId: string,
  instrument: string,
  paymentRef?: string,
): Promise<FraudFlagType | null> {
  if (!instrument || instrument.length < 3) return null;

  // Look for the instrument string in other users' payloads
  // We search in payment payloads for the instrument identifier
  const others = await prisma.paymentEvent.findMany({
    where: {
      userId:     { not: userId },
      status:     'SUCCESS',
      payload:    { contains: instrument },
    },
    select: { userId: true },
    take: 5,
  });

  const otherUserIds = [...new Set(others.map((e) => e.userId))];
  if (otherUserIds.length > 0) {
    await flagUser(
      userId,
      'DUPLICATE_INSTRUMENT',
      otherUserIds.length >= 2 ? 'CRITICAL' : 'HIGH',
      { instrument, otherUserIds },
      paymentRef,
    );
    return 'DUPLICATE_INSTRUMENT';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Check 4 — Cross-account IP
// ---------------------------------------------------------------------------

async function checkCrossAccountIp(
  userId: string,
  ip: string,
  paymentRef?: string,
): Promise<FraudFlagType | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Search for other payment events with this IP in their payload
  const others = await prisma.paymentEvent.findMany({
    where: {
      userId:    { not: userId },
      createdAt: { gte: since },
      payload:   { contains: `"ip":"${ip}"` },
    },
    select: { userId: true },
    take: 10,
  });

  const otherUserIds = [...new Set(others.map((e) => e.userId))];
  if (otherUserIds.length >= IP_MAX_ACCOUNTS) {
    await flagUser(
      userId,
      'CROSS_ACCOUNT',
      otherUserIds.length >= 5 ? 'CRITICAL' : 'MEDIUM',
      { ip, otherUserIds, windowHours: 24 },
      paymentRef,
    );
    return 'CROSS_ACCOUNT';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Check 5 — Rapid plan switch
// ---------------------------------------------------------------------------

async function checkRapidPlanSwitch(userId: string, paymentRef?: string): Promise<FraudFlagType | null> {
  const since = new Date(Date.now() - RAPID_SWITCH_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const count = await prisma.paymentEvent.count({
    where: {
      userId,
      createdAt: { gte: since },
      status:    'SUCCESS',
      eventType: { in: ['PAYMENT', 'UPGRADE'] },
    },
  });

  if (count >= RAPID_SWITCH_MAX_CHANGES) {
    await flagUser(
      userId,
      'RAPID_PLAN_SWITCH',
      'MEDIUM',
      { successfulPayments: count, windowDays: RAPID_SWITCH_WINDOW_DAYS },
      paymentRef,
    );
    return 'RAPID_PLAN_SWITCH';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Master check — run all heuristics, return aggregated result
// ---------------------------------------------------------------------------

export async function runFraudChecks(input: FraudCheckInput): Promise<FraudCheckResult> {
  const { userId, plan, amountPaise, instrument, ip, paymentRef } = input;

  // Fast pre-check: is user already BLOCKED?
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { fraudRisk: true },
  });
  if (user?.fraudRisk === 'BLOCKED') {
    return { blocked: true, risk: 'CRITICAL', flags: [], reason: 'user_blocked_by_admin' };
  }

  // Run all checks in parallel
  const [vel, amt, dup, cross, rapid] = await Promise.all([
    checkVelocity(userId, paymentRef),
    checkSuspiciousAmount(userId, amountPaise, plan, paymentRef),
    instrument ? checkDuplicateInstrument(userId, instrument, paymentRef) : Promise.resolve(null),
    ip         ? checkCrossAccountIp(userId, ip, paymentRef)              : Promise.resolve(null),
    checkRapidPlanSwitch(userId, paymentRef),
  ]);

  const triggeredFlags = [vel, amt, dup, cross, rapid].filter(Boolean) as FraudFlagType[];

  // Determine aggregate risk
  const freshUser = await prisma.user.findUnique({
    where:  { id: userId },
    select: { fraudRisk: true },
  });
  const risk = (freshUser?.fraudRisk ?? 'NONE') as FraudRisk | 'NONE';

  // Block if HIGH or CRITICAL flags were raised
  const blocked = risk === 'CRITICAL' || risk === 'HIGH' || risk === 'BLOCKED';

  return { blocked, risk, flags: triggeredFlags };
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

/** Resolve all open fraud flags for a user and reset their fraudRisk */
export async function resolveFraudFlags(userId: string, resolvedBy: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.fraudFlag.updateMany({
      where: { userId, resolved: false },
      data:  { resolved: true, resolvedAt: now, resolvedBy },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { fraudRisk: 'NONE' },
    }),
  ]);
}

/** Permanently block a user from paying (sets fraudRisk = BLOCKED) */
export async function blockUser(userId: string, reason: string, resolvedBy: string): Promise<void> {
  await prisma.$transaction([
    prisma.fraudFlag.create({
      data: {
        userId,
        type:    'VELOCITY',
        risk:    'CRITICAL',
        details: JSON.stringify({ reason, blockedBy: resolvedBy }),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { fraudRisk: 'BLOCKED' },
    }),
  ]);
}

/** List open fraud flags, optionally filtered by risk level */
export async function listOpenFraudFlags(risk?: FraudRisk) {
  return prisma.fraudFlag.findMany({
    where: {
      resolved: false,
      ...(risk ? { risk } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
