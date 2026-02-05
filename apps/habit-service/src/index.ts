import 'dotenv/config';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { isAuth } from "./middleware/auth.middleware.js";
import habitRouter from "./routes/habit.route.js";
import { handleHabitEvent } from "./controllers/habit.controller.js";


const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
    res.send("Habit Service API");
});

app.post("/api/habits/events", handleHabitEvent);
app.use("/api/habits", isAuth, habitRouter);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});