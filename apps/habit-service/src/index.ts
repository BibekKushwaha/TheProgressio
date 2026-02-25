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
import { closeNudgeDispatchQueue } from "./services/nudge-dispatch.queue.js";


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

    app.listen(PORT, async () => {
        console.log(`🚀 Habit service running on port ${PORT}`);
        console.log(`🔗 Accepting requests from: ${FRONTEND_URL}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
        console.log("🔄 Shutting down habit-service...");
        await shutdownWorker();
        await closeNudgeDispatchWorker();
        await closeNudgeDispatchQueue();
        process.exit(0);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
}
