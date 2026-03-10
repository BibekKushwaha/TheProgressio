import { Router } from "express";
import {
    createHabit,
    parseHabit,
    deleteHabit,
    getAllHabits,
    getHabitStats,
    logHabitCompletion,
    updateHabit,
    resetHabit,
    getUserXP,
    getContributionHeatmap,
    getNudges,
    getNudgeSettings,
    markNudgeAsRead,
    markAllNudgesAsRead,
    getMorningBriefing,
    updateNudgeSettings,
    getBootstrap,
    getBootstrapCritical,
} from "../controllers/habit.controller.js";

const router = Router();

// ── Dashboard Bootstrap (habits + XP + heatmap + nudges in one round-trip) ───
router.get("/bootstrap", getBootstrap);
// ── Critical-only bootstrap (habits + XP) used during React streaming ──────
router.get("/bootstrap/critical", getBootstrapCritical);

// ── XP & Gamification ──────────────────
router.get("/xp", getUserXP);

// ── 365-Day Heatmap ────────────────────
router.get("/heatmap", getContributionHeatmap);

// ── Adaptive Nudges ────────────────────
router.get("/nudges", getNudges);
router.get("/nudges/settings", getNudgeSettings);
router.put("/nudges/settings", updateNudgeSettings);
router.post("/nudges/:id/read", markNudgeAsRead);
router.post("/nudges/read-all", markAllNudgesAsRead);

// ── Morning Briefing ───────────────────
router.get("/briefing", getMorningBriefing);

// ── Core CRUD ──────────────────────────
router.post("/parse", parseHabit);
router.post("/", createHabit);
router.post("/:id/log", logHabitCompletion);
router.get("/", getAllHabits);
router.get("/:id/stats", getHabitStats);
router.put("/:id", updateHabit);
router.delete("/:id", deleteHabit);
router.post("/:id/reset", resetHabit);

export default router;
