import { Router } from "express";
import {
    createHabit,
    deleteHabit,
    getAllHabits,
    getHabitStats,
    logHabitCompletion,
    updateHabit,
    resetHabit,
    getUserXP,
    getContributionHeatmap,
    getNudges,
    markNudgeAsRead,
    markAllNudgesAsRead,
    getMorningBriefing,
} from "../controllers/habit.controller.js";

const router = Router();

// ── XP & Gamification ──────────────────
router.get("/xp", getUserXP);

// ── 365-Day Heatmap ────────────────────
router.get("/heatmap", getContributionHeatmap);

// ── Adaptive Nudges ────────────────────
router.get("/nudges", getNudges);
router.post("/nudges/:id/read", markNudgeAsRead);
router.post("/nudges/read-all", markAllNudgesAsRead);

// ── Morning Briefing ───────────────────
router.get("/briefing", getMorningBriefing);

// ── Core CRUD ──────────────────────────
router.post("/", createHabit);
router.post("/:id/log", logHabitCompletion);
router.get("/", getAllHabits);
router.get("/:id/stats", getHabitStats);
router.put("/:id", updateHabit);
router.delete("/:id", deleteHabit);
router.post("/:id/reset", resetHabit);

export default router;