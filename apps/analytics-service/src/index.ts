import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from 'express-rate-limit';
import activityRouter from "./routes/activity.route.js";
import statsRouter from "./routes/stats.route.js";
import { getAnalyticsOperationalMetricsSnapshot, recordAnalyticsRequestMetric } from './services/metrics.service.js';
import { shutdownWorker } from "./services/worker.service.js";
import { shutdownSimulationService } from "./services/simulation.service.js";
import { shutdownExportWorker } from "./services/export.service.js";
import { prisma } from "@repo/db/client";
import {
    registerOperationalMiddleware,
    registerOperationalRoutes,
    registerProcessSafetyHandlers,
    validateRequiredEnv,
} from "@repo/schemas/runtime";

validateRequiredEnv({
    serviceName: 'analytics-service',
    requiredEnv: ['DATABASE_URL', 'JWT_SEC'],
});

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
registerOperationalMiddleware({
    app,
    serviceName: 'analytics-service',
});
app.use((req, res, next) => {
    res.on('finish', () => {
        const routePath = (req as typeof req & { route?: { path?: string } }).route?.path ?? req.path;
        const route = `${req.baseUrl || ''}${routePath}` || req.originalUrl || req.path;
        recordAnalyticsRequestMetric(req.method, route, res.statusCode);
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
    res.json({ message: "Analytics Service API", status: "UP" });
});

registerOperationalRoutes({
    app,
    serviceName: 'analytics-service',
    collectMetrics: getAnalyticsOperationalMetricsSnapshot,
    readinessChecks: [
        {
            name: 'database',
            check: async () => {
                await prisma.$queryRaw`SELECT 1`;
            },
        },
    ],
});

app.use("/api/activity", activityRouter);
app.use("/api/stats", statsRouter);

const PORT = process.env.PORT || 4003;

if (process.env.NODE_ENV !== 'test') {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Analytics Service running on port ${PORT}`);
        console.log(`🔗 Interface: ${FRONTEND_URL}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
        console.log("Shutting down Analytics Service...");
        await Promise.allSettled([
            new Promise<void>((resolve) => {
                server.close(() => resolve());
            }),
            shutdownWorker(),
            shutdownSimulationService(),
            shutdownExportWorker(),
        ]);
    };
    registerProcessSafetyHandlers({
        serviceName: 'analytics-service',
        shutdown,
    });
}
