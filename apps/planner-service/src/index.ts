import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { isAuth } from "./middleware/auth.middleware.js";
import taskRouter from "./routes/task.route.js";
import categoryRouter from "./routes/category.route.js";
import subtaskRouter from "./routes/subtask.route.js";
import attachmentRouter from "./routes/attachment.route.js";
import timetableRouter from "./routes/timetable.route.js";
import calendarRouter from "./routes/calendar.routes.js";
import rotationRouter from "./routes/rotation.route.js";
import whatsappRouter from "./routes/whatsapp.route.js";
import attendanceRouter from "./routes/attendance.route.js";
import paymentRouter from "./routes/payment.route.js";
import syncRouter from "./routes/sync.route.js";
import notificationRouter from "./routes/notification.route.js";
import { shutdownProducer } from "./services/queue.service.js";
import { runSilentWatchSweep } from "./services/whatsapp-watch.service.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(cookieParser());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));


app.get("/", (_req, res) => {
    res.send("Task Management API");
});

app.use("/api/integrations/whatsapp", whatsappRouter);
app.use("/api/attendance", isAuth, attendanceRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/sync", isAuth, syncRouter);
app.use("/api/notifications", isAuth, notificationRouter);
app.use("/api/tasks", isAuth, taskRouter);
app.use("/api/categories", isAuth, categoryRouter);
app.use("/api/subtasks", isAuth, subtaskRouter);
app.use("/api/attachments", isAuth, attachmentRouter);
app.use("/api/timetable", isAuth, timetableRouter);
app.use("/api/calendar", isAuth, calendarRouter);
app.use("/api/rotations", isAuth, rotationRouter);

app.use(errorMiddleware);

const PORT = process.env.PORT || 4001;

if (process.env.NODE_ENV !== 'test') {
    if (process.env.WHATSAPP_SILENT_WATCH_CRON_ENABLED === 'true') {
        const intervalMinutes = Number(process.env.WHATSAPP_SILENT_WATCH_INTERVAL_MINUTES || 60);
        setInterval(() => {
            runSilentWatchSweep().catch((error) => {
                console.warn('Silent watch sweep failed:', error);
            });
        }, Math.max(5, intervalMinutes) * 60 * 1000);
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    const shutdown = async () => {
        console.log("Shutting down Planner Service...");
        await shutdownProducer();
        process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}
