import { Router } from "express";
import { getMonthlyEvents, getDailySchedule } from "../controllers/calendar.controller.js";

const router = Router();

router.get("/month", getMonthlyEvents);
router.get("/day", getDailySchedule);

export default router;
