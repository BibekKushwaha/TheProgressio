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
import paymentRouter from "./routes/payment.route.js";
import syncRouter from "./routes/sync.route.js";
import { producer } from "./services/producer.service.js";
import { runSilentWatchSweep } from "./services/whatsapp-watch.service.js";

export const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (_req, res) => {
    res.send("Task Management API");
});

app.use("/api/integrations/whatsapp", whatsappRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/sync", isAuth, syncRouter);
app.use("/api/tasks", isAuth, taskRouter);
app.use("/api/categories", isAuth, categoryRouter);
app.use("/api/subtasks", isAuth, subtaskRouter);
app.use("/api/attachments", isAuth, attachmentRouter);
app.use("/api/timetable", isAuth, timetableRouter);
app.use("/api/calendar", isAuth, calendarRouter);
app.use("/api/rotations", isAuth, rotationRouter);

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

    // Connect Kafka producer before starting the server
    producer.connect().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }).catch((err) => {
        console.warn("⚠️  Kafka connection failed, starting server without Kafka:", err);
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT} (Kafka unavailable)`);
        });
    });
}
