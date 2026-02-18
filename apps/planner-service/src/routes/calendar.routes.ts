import { Router } from "express";
import { getMonthlyEvents, getDailySchedule } from "../controllers/calendar.controller.js";
import { createExam } from "../controllers/exam.controller.js";

const router = Router();

router.get("/month", getMonthlyEvents);
router.get("/day", getDailySchedule);
router.post("/exam", createExam);

export default router;
