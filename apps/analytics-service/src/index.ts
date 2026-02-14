import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import activityRouter from "./routes/activity.route.js";
import statsRouter from "./routes/stats.route.js";
import { analyticsConsumer, shutdownConsumer } from "./services/consumer.service.js";

export const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
    res.send("Analytics Service API");
});

app.use("/api/activity", activityRouter);
app.use("/api/stats", statsRouter);

const PORT = process.env.PORT || 4003;

if (process.env.NODE_ENV !== 'test') {
    // Start Kafka consumer
    analyticsConsumer.connect()
        .then(() => analyticsConsumer.run())
        .catch((err) => console.error("Failed to start analytics Kafka consumer:", err));

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
        await shutdownConsumer();
        process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
}