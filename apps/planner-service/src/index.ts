import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import { producer } from "./services/producer.service.js";

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
app.use("/api/tasks", isAuth, enforceReadOnlyWrites, taskRouter);
app.use("/api/categories", isAuth, enforceReadOnlyWrites, categoryRouter);
app.use("/api/subtasks", isAuth, enforceReadOnlyWrites, subtaskRouter);
app.use("/api/attachments", isAuth, enforceReadOnlyWrites, attachmentRouter);
app.use("/api/timetable", isAuth, enforceReadOnlyWrites, timetableRouter);
app.use("/api/calendar", isAuth, enforceReadOnlyWrites, calendarRouter);
app.use("/api/rotations", isAuth, enforceReadOnlyWrites, rotationRouter);
app.use("/api/payments", paymentRouter);

const PORT = process.env.PORT || 4001;

if (process.env.NODE_ENV !== 'test') {
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
