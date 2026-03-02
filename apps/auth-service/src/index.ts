import express from 'express';
import 'dotenv/config';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import userRouter from './routes/auth.route.js';
import cors from 'cors';
import cookieParser from "cookie-parser";
import type { Request, Response, NextFunction } from 'express';

import { closeEmailWorker } from "./services/email.worker.js";
import { closeEmailQueue } from "./services/email.queue.js";
import { prisma } from "@repo/db/client";

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const isProduction = process.env.NODE_ENV === 'production';

// ─── Security headers (helmet) ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // allow API clients from different origins
}));

app.use(cors({
  origin: isProduction ? FRONTEND_ORIGIN : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-family-share-token'],
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// ─── CSRF: Origin check for state-changing requests ──────────────────────────
// sameSite: 'lax' already blocks most CSRF. This adds defense-in-depth by
// rejecting POST/PUT/DELETE requests whose Origin doesn't match the frontend
// in production. Mobile clients use Bearer tokens (no cookies) so they are
// explicitly excluded from this check.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!isProduction) return next();
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) return next();
  // Mobile Bearer-token routes don't use cookies → skip CSRF check
  if (req.headers.authorization?.startsWith('Bearer ')) return next();
  const origin = req.headers.origin ?? req.headers.referer ?? '';
  if (origin && !origin.startsWith(FRONTEND_ORIGIN)) {
    return res.status(403).json({ message: 'CSRF check failed: invalid origin' });
  }
  next();
});

// Global rate limit: cap all auth-service routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

// Login: 5 attempts per 10 min per IP (skipSuccessful so a legit login
// doesn't consume quota, only failed or suspicious attempts)
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please wait 10 minutes and try again.' },
  skipSuccessfulRequests: true,
});

// Register: slightly looser — prevents mass signups but doesn't hurt normal users
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts, please try again later.' },
});

// Forgot password: 3 requests per hour per IP to prevent email flooding
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset requests. Please wait an hour and try again.' },
});

// Reset password: 10 per hour (token is already single-use, but belt-and-suspenders)
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts, please try again later.' },
});

// Tighter cap on token-refresh endpoints (10 per 15min per IP)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many refresh attempts, please try again later' },
});

app.use(globalLimiter);
// Per-endpoint rate limits (applied before the router)
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/mobile/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/forgot', forgotLimiter);
app.use('/api/auth/reset', resetLimiter);
// Tighter rate limit on refresh token endpoints
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api/auth/mobile/refresh', refreshLimiter);
app.use('/api/auth', userRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Auth Service API', status: 'UP' });
});

// ─── Expired session cleanup ──────────────────────────────────────────────────
// Deletes refresh tokens that have passed their expiresAt date so the DB
// doesn't grow forever. Runs every 24h. Uses best-effort (never crashes server).
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function cleanupExpiredSessions(): Promise<void> {
  try {
    const now = new Date();
    const [refreshResult, resetResult] = await Promise.all([
      prisma.mobileRefreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);
    if (refreshResult.count > 0) {
      console.log(`[SessionCleanup] Deleted ${refreshResult.count} expired refresh token(s)`);
    }
    if (resetResult.count > 0) {
      console.log(`[SessionCleanup] Deleted ${resetResult.count} expired password reset token(s)`);
    }
  } catch (err) {
    console.error('[SessionCleanup] Failed to clean up expired sessions:', err);
  }
}

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Auth service running on port ${PORT}`);
    console.log(`🔗 Accepting requests from: ${FRONTEND_ORIGIN}`);
    console.log(`📧 Email worker initialized (BullMQ)`);
  });

  // Run cleanup once at startup, then on a 24h interval
  cleanupExpiredSessions();
  const cleanupTimer = setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down Auth Service...");
    clearInterval(cleanupTimer);
    await Promise.all([
      closeEmailWorker(),
      closeEmailQueue(),
      prisma.$disconnect(),
    ]);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export default app;
