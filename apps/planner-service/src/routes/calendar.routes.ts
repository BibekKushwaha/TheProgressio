import { Router } from "express";
import { getMonthlyEvents, getDailySchedule } from "../controllers/calendar.controller.js";
import { isAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/month", isAuth, getMonthlyEvents);
router.get("/day", isAuth, getDailySchedule);

export default router;
