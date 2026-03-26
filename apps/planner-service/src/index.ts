import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from 'express-rate-limit';
import { enforceReadOnlyWrites, isAuth } from "./middleware/auth.middleware.js";
import taskRouter from "./routes/task.route.js";
import categoryRouter from "./routes/category.route.js";
import subtaskRouter from "./routes/subtask.route.js";
import attachmentRouter from "./routes/attachment.route.js";
import timetableRouter from "./routes/timetable.route.js";
import calendarRouter from "./routes/calendar.routes.js";
import rotationRouter from "./routes/rotation.route.js";
import whatsappRouter from "./routes/whatsapp.route.js";
import paymentRouter from "./routes/payment.route.js";
import revenueRouter from "./routes/revenue.route.js";
import syncRouter from "./routes/sync.route.js";
import notificationRouter from "./routes/notification.route.js";
import noteRouter from "./routes/note.route.js";
import auditRouter from "./routes/audit.route.js";
import syllabusRouter from "./routes/syllabus.route.js";
import { getAiCircuitBreakerState, isAiKillSwitchActive } from "./services/ai.service.js";
import { shutdownProducer } from "./services/queue.service.js";
import { getOperationalMetricsSnapshot as getWhatsAppOperationalMetricsSnapshot } from "./services/whatsapp-audit.service.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { initPushWorker } from "./workers/push.worker.js";
import { startRenewalWorker, stopRenewalWorker } from "./services/renewal.service.js";
import { prisma } from "@repo/db/client";
import {
    registerOperationalMiddleware,
    registerOperationalRoutes,
    registerProcessSafetyHandlers,
    validateRequiredEnv,
} from "@repo/schemas/runtime";

validateRequiredEnv({
    serviceName: 'planner-service',
    requiredEnv: ['DATABASE_URL', 'JWT_SEC'],
});

export const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_URL ?? "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";

app.use(cors({
    origin: isProduction ? FRONTEND_ORIGIN : true,
    credentials: true
}));

app.use(cookieParser());

app.use(express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
        // Used for validating Meta WhatsApp webhook signatures (x-hub-signature-256).
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
    },
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
registerOperationalMiddleware({
    app,
    serviceName: 'planner-service',
});

// Global rate limit
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

app.get("/", (_req, res) => {
    res.send("Task Management API");
});

registerOperationalRoutes({
    app,
    serviceName: 'planner-service',
    collectMetrics: async () => {
        const [whatsAppMetrics, aiKillSwitchEnabled] = await Promise.all([
            getWhatsAppOperationalMetricsSnapshot(),
            isAiKillSwitchActive(),
        ]);
        const aiCircuitBreaker = getAiCircuitBreakerState();

        return {
            ...whatsAppMetrics,
            wa_ai_circuit_breaker_state: aiCircuitBreaker.state === 'open'
                ? 1
                : aiCircuitBreaker.state === 'half-open'
                    ? 2
                    : 0,
            wa_ai_circuit_breaker_failure_count: aiCircuitBreaker.failureCount,
            wa_ai_circuit_breaker_next_retry_at_ms: aiCircuitBreaker.nextRetryAt ?? 0,
            wa_ai_kill_switch_enabled: aiKillSwitchEnabled ? 1 : 0,
        };
    },
    readinessChecks: [
        {
            name: 'database',
            check: async () => {
                await prisma.$queryRaw`SELECT 1`;
            },
        },
    ],
});

app.use("/api/integrations/whatsapp", whatsappRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/revenue",  revenueRouter);
app.use("/api/sync", isAuth, enforceReadOnlyWrites(), syncRouter);
app.use("/api/notifications", isAuth, enforceReadOnlyWrites(), notificationRouter);
app.use("/api/tasks", isAuth, enforceReadOnlyWrites(), taskRouter);
app.use("/api/categories", isAuth, enforceReadOnlyWrites(), categoryRouter);
app.use("/api/subtasks", isAuth, enforceReadOnlyWrites(), subtaskRouter);
app.use("/api/attachments", isAuth, enforceReadOnlyWrites(), attachmentRouter);
app.use("/api/timetable", isAuth, enforceReadOnlyWrites(), timetableRouter);
app.use("/api/calendar", isAuth, enforceReadOnlyWrites(), calendarRouter);
app.use("/api/rotations", isAuth, enforceReadOnlyWrites(), rotationRouter);
app.use("/api/notes", isAuth, enforceReadOnlyWrites(), noteRouter);
app.use("/api/audit-logs", isAuth, enforceReadOnlyWrites(), auditRouter);
app.use("/api/syllabus", isAuth, enforceReadOnlyWrites(), syllabusRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT || 4001;

// Initialize workers
const pushWorker = initPushWorker();

if (process.env.NODE_ENV !== 'test') {
    startRenewalWorker().catch((err) => {
        console.warn('[renewal] worker failed to start (Redis unavailable?)', err?.message ?? err);
    });

    const server = app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    const shutdown = async () => {
        console.log("Shutting down Planner Service...");
        await Promise.allSettled([
            new Promise<void>((resolve) => {
                server.close(() => resolve());
            }),
            shutdownProducer(),
            pushWorker ? pushWorker.close() : Promise.resolve(),
            stopRenewalWorker().catch(() => null),
        ]);
    };

    registerProcessSafetyHandlers({
        serviceName: 'planner-service',
        shutdown,
    });
}
