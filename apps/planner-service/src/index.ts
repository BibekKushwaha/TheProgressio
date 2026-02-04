import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { isAuth } from "./middleware/auth.middleware.js";
import taskRouter from "./routes/task.route.js";
import categoryRouter from "./routes/category.route.js";

const app = express();

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

app.use("/api/tasks", isAuth, taskRouter);
app.use("/api/categories", isAuth, categoryRouter);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});