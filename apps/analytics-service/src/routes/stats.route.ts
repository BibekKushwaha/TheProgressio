import { Router } from "express";
import { getDailySummary, getFocusScore, getTaskEfficiency, getWeeklyTrends, handleTaskCompletedEvent } from "../controllers/stats.controller.js";
import { isAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Stats
router.get("/daily", isAuth, getDailySummary);
router.get("/weekly", isAuth, getWeeklyTrends);
router.get("/task/:id", isAuth, getTaskEfficiency);
router.get("/focus", isAuth, getFocusScore);

router.post("/events/task-completed", handleTaskCompletedEvent);


export default router;