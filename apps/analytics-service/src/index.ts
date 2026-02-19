import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import activityRouter from "./routes/activity.route.js";
import statsRouter from "./routes/stats.route.js";
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
    res.json({ message: "Analytics Service API", status: "UP" });
});

app.use("/api/activity", activityRouter);
app.use("/api/stats", statsRouter);

const PORT = process.env.PORT || 4003;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Analytics Service running on port ${PORT}`);
        console.log(`🔗 Interface: ${FRONTEND_URL}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
        console.log("Shutting down Analytics Service...");
        await shutdownWorker();
        process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}