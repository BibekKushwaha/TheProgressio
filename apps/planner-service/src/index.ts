import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { isAuth } from "./middleware/auth.middleware.js";
import taskRouter from "./routes/task.route.js";
import categoryRouter from "./routes/category.route.js";

export const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger to help debug duplicate/invalid requests
app.use((req, _res, next) => {
    try {
        console.log(`[req] ${req.method} ${req.path} body=${JSON.stringify(req.body || {})}`);
    } catch (e) {
        console.log(`[req] ${req.method} ${req.path}`);
    }
    next();
});

// Log response status when request finishes
app.use((req, res, next) => {
    res.on('finish', () => {
        try {
            console.log(`[res] ${req.method} ${req.path} -> ${res.statusCode}`);
        } catch (e) {
            console.log(`[res] ${req.method} ${req.path} -> ${res.statusCode}`);
        }
    });
    next();
});

app.get("/", (_req, res) => {
    res.send("Task Management API");
});

app.use("/api/tasks", isAuth, taskRouter);
app.use("/api/categories", isAuth, categoryRouter);

const PORT = process.env.PORT || 4001;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}