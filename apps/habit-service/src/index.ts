import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { enforceReadOnlyWrites, isAuth } from "./middleware/auth.middleware.js";
import habitRouter from "./routes/habit.route.js";
import { dispatchNudges, handleHabitEvent } from "./controllers/habit.controller.js";
import { requireInternalDispatchAuth, requireInternalSignature } from "./middleware/internal.middleware.js";
import { habitConsumer, shutdownConsumer } from "./services/consumer.service.js";


export const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
    res.send("Habit Service API");
});

app.post("/api/habits/events", requireInternalSignature, handleHabitEvent);
app.post("/api/habits/nudges/dispatch", requireInternalDispatchAuth, dispatchNudges);
app.use("/api/habits", isAuth, enforceReadOnlyWrites, habitRouter);

const PORT = process.env.PORT || 4002;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, async () => {
        console.log(`Server running on port ${PORT}`);

        // Start Kafka consumer for async habit automation
        try {
            await habitConsumer.connect();
            await habitConsumer.run();
        } catch (error) {
            console.error("Failed to start Kafka consumer — HTTP fallback still active:", error);
        }
    });

    // Graceful shutdown
    const gracefulShutdown = async () => {
        console.log("🔄 Shutting down habit-service...");
        await shutdownConsumer();
        process.exit(0);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
}
