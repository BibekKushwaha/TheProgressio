import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import activityRouter from "./routes/activity.route.js";
import statsRouter from "./routes/stats.route.js";

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
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}