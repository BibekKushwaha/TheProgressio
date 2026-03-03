import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from 'express-rate-limit';
import { enforceReadOnlyWrites, isAuth } from "./middleware/auth.middleware.js";
import habitRouter from "./routes/habit.route.js";
import {
    cancelInternalWhatsAppFallback,
    dispatchNudges,
    getInternalActiveDates,
    getInternalMetrics,
    handleHabitEvent,
} from "./controllers/habit.controller.js";
import { requireInternalDispatchAuth, requireInternalReadAuth, requireInternalSignature } from "./middleware/internal.middleware.js";
import { shutdownWorker } from "./services/worker.service.js";
import { initNudgeDispatchWorker, closeNudgeDispatchWorker } from "./services/nudge-dispatch.worker.js";
import { closeNudgeDispatchQueue, enqueueDueNudgeDispatchJobs } from "./services/nudge-dispatch.queue.js";
import { recordLatency } from "./services/metrics.service.js";


export const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";

app.use(cors({
    origin: isProduction ? FRONTEND_URL : true,
    credentials: true
}));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Per-endpoint latency middleware ─────────────────────────────────────────
// Hooks into res 'finish' so the measurement is always taken — even when a
// route handler throws and the error-handler sends the response.
app.use((req, res, next) => {
    const startNs = process.hrtime.bigint();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
        // req.route is set by Express after the handler is matched
        const routePath: string = (req as any).route?.path ?? req.path;
        const key = `${req.method} ${routePath}`;
        recordLatency(key, durationMs);
    });
    next();
});

// Global rate limit
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

app.get("/", (_req, res) => {
    res.json({ message: "Habit Service API", status: "UP" });
});

app.post("/api/habits/events", requireInternalSignature, handleHabitEvent);
app.post("/api/habits/nudges/dispatch", requireInternalDispatchAuth, dispatchNudges);
app.get("/api/habits/internal/active-dates", requireInternalReadAuth, getInternalActiveDates);
app.get("/api/habits/internal/metrics", requireInternalReadAuth, getInternalMetrics);
app.post("/api/habits/internal/wa-fallback/cancel", requireInternalReadAuth, cancelInternalWhatsAppFallback);
app.use("/api/habits", isAuth, enforceReadOnlyWrites, habitRouter);

const PORT = process.env.PORT || 4002;

if (process.env.NODE_ENV !== 'test') {
    initNudgeDispatchWorker();

    // ── Nudge Dispatch Scheduler ─────────────────────────────────────────────
    // Poll for due nudges and enqueue them into BullMQ every N seconds.
    // This runs entirely in-process so no external cron job is required.
    // The worker (initNudgeDispatchWorker above) consumes the jobs it produces.
    const NUDGE_DISPATCH_INTERVAL_MS = Math.max(
        30_000,
        Number(process.env.NUDGE_DISPATCH_INTERVAL_MS ?? '60000')
    );
    const nudgeDispatchTimer = setInterval(() => {
        enqueueDueNudgeDispatchJobs(50).catch((err: unknown) => {
            console.error('[NudgeScheduler] Failed to enqueue due nudge jobs:', err);
        });
    }, NUDGE_DISPATCH_INTERVAL_MS);
    // run once immediately on startup to drain any backlog
    enqueueDueNudgeDispatchJobs(100).catch((err: unknown) => {
        console.error('[NudgeScheduler] Initial enqueue failed:', err);
    });

    app.listen(PORT, async () => {
        console.log(`🚀 Habit service running on port ${PORT}`);
        console.log(`🔗 Accepting requests from: ${FRONTEND_URL}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
        console.log("🔄 Shutting down habit-service...");
        clearInterval(nudgeDispatchTimer);
        await shutdownWorker();
        await closeNudgeDispatchWorker();
        await closeNudgeDispatchQueue();
        process.exit(0);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
}
