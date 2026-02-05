import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import analyticsRouter from "./routes/activity.route.js";


const app = express();

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

app.use("/api", analyticsRouter);

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});