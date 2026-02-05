import {Router} from "express";
import { getDailySummary, getFocusScore, getTaskEfficiency, getWeeklyTrends, handleTaskCompletedEvent } from "../controllers/stats.controller.js";
import { isAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Stats
router.get("/stats/daily", isAuth, getDailySummary);
router.get("/stats/weekly", isAuth, getWeeklyTrends);
router.get("/stats/task/:id", isAuth, getTaskEfficiency);
router.get("/stats/focus", isAuth, getFocusScore); 

router.post("/events/task-completed", handleTaskCompletedEvent);
    

export default router;