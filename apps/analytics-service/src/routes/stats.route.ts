import { Router } from "express";
import {
    getDailySummary, getAchievements, getFocusScore, getTaskEfficiency,
    getUserStreak, getWeeklyTrends, handleTaskCompletedEvent,
    // Phase 3 — Prediction
    getPrediction, getCycleTime,
    // Phase 3 — SWOT
    getSWOTAnalysis, getSubjectStats,
    // Phase 3 — GPA
    getGPA, getWhatIfGPA, addCourse, updateCourse, deleteCourse, previewGPAComponents,
    // Phase 3 — Grade Entries
    addGradeEntry, getGradeEntries, deleteGradeEntry,
    // Phase 3 — Focus / Leakage
    getTimeLeakage, getPeakWindow, getPredictivePerformanceEndpoint,
} from "../controllers/stats.controller.js";
import { enforceReadOnlyWrites, isAuth } from "../middleware/auth.middleware.js";

const router = Router();

// ── Existing stats ─────────────────────────────────────────────────────
router.get("/daily", isAuth, getDailySummary);
router.get("/weekly", isAuth, getWeeklyTrends);
router.get("/task/:id", isAuth, getTaskEfficiency);
router.get("/focus", isAuth, getFocusScore);
router.get("/streak", isAuth, getUserStreak);
router.get("/achievements", isAuth, getAchievements);

// ── Duration Prediction (PERT) ─────────────────────────────────────────
router.get("/predict", isAuth, getPrediction);
router.get("/cycle-time", isAuth, getCycleTime);

// ── SWOT Analysis ──────────────────────────────────────────────────────
router.get("/swot/:examType", isAuth, getSWOTAnalysis);
router.get("/subject/:name", isAuth, getSubjectStats);

// ── GPA Calculator ─────────────────────────────────────────────────────
router.get("/gpa", isAuth, getGPA);
router.post("/gpa/what-if", isAuth, enforceReadOnlyWrites, getWhatIfGPA);
router.post("/gpa/components/preview", isAuth, enforceReadOnlyWrites, previewGPAComponents);
router.post("/gpa/course", isAuth, enforceReadOnlyWrites, addCourse);
router.put("/gpa/course/:id", isAuth, enforceReadOnlyWrites, updateCourse);
router.delete("/gpa/course/:id", isAuth, enforceReadOnlyWrites, deleteCourse);

// ── Grade Entries ──────────────────────────────────────────────────────
router.post("/grade-entry", isAuth, enforceReadOnlyWrites, addGradeEntry);
router.get("/grade-entries", isAuth, getGradeEntries);
router.delete("/grade-entry/:id", isAuth, enforceReadOnlyWrites, deleteGradeEntry);

// ── Focus & Time Leakage ──────────────────────────────────────────────
router.get("/focus/leakage", isAuth, getTimeLeakage);
router.get("/focus/peak-window", isAuth, getPeakWindow);
router.get("/performance/:examType", isAuth, getPredictivePerformanceEndpoint);

// ── Events ─────────────────────────────────────────────────────────────
router.post("/events/task-completed", handleTaskCompletedEvent);

export default router;
