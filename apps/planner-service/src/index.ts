import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { isAuth } from "./middleware/auth.middleware.js";
import taskRouter from "./routes/task.route.js";
import categoryRouter from "./routes/category.route.js";
import subtaskRouter from "./routes/subtask.route.js";
import attachmentRouter from "./routes/attachment.route.js";

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

app.use("/api/tasks", isAuth, taskRouter);
app.use("/api/categories", isAuth, categoryRouter);
app.use("/api/subtasks", isAuth, subtaskRouter);
app.use("/api/attachments", isAuth, attachmentRouter);

const PORT = process.env.PORT || 4001;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}