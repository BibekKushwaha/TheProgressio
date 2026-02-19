import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { enforceReadOnlyWrites, isAuth } from "./middleware/auth.middleware.js";
import habitRouter from "./routes/habit.route.js";
import { dispatchNudges, getInternalActiveDates, handleHabitEvent } from "./controllers/habit.controller.js";
import { requireInternalDispatchAuth, requireInternalReadAuth, requireInternalSignature } from "./middleware/internal.middleware.js";
import { shutdownWorker } from "./services/worker.service.js";


export const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
    res.json({ message: "Habit Service API", status: "UP" });
});

app.post("/api/habits/events", requireInternalSignature, handleHabitEvent);
app.post("/api/habits/nudges/dispatch", requireInternalDispatchAuth, dispatchNudges);
app.get("/api/habits/internal/active-dates", requireInternalReadAuth, getInternalActiveDates);
app.use("/api/habits", isAuth, enforceReadOnlyWrites, habitRouter);

const PORT = process.env.PORT || 4002;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, async () => {
        console.log(`🚀 Habit service running on port ${PORT}`);
        console.log(`🔗 Accepting requests from: ${FRONTEND_URL}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
        console.log("🔄 Shutting down habit-service...");
        await shutdownWorker();
        process.exit(0);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
}
