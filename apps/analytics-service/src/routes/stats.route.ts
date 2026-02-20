import { Router } from "express";
import {
    getDailySummary, getAchievements, getFocusScore, getTaskEfficiency,
    getUserStreak, getWeeklyTrends, handleTaskCompletedEvent,
    // Phase 3 — Prediction
    getPrediction, predictGradeEndpoint, getCycleTime,
    // Phase 3 — SWOT
    getSWOTAnalysis, getSubjectStats,
    // Phase 3 — GPA
    getGPA, getWhatIfGPA, addCourse, updateCourse, deleteCourse,
    // Phase 3 — Grade Entries
    addGradeEntry, getGradeEntries, updateGradeEntry, deleteGradeEntry,
    // Phase 3 — Focus / Leakage
    getTimeLeakage, getPeakWindow, getPredictivePerformanceEndpoint,
    getRevisionSchedule,
    getInternalConsistency,
    getNotificationIntelligence,
    getActiveContextSignals,
    // BFF — Dashboard
    getDashboardSummary,
    getStrategicSummary,
} from "../controllers/stats.controller.js";
import { isAuth } from "../middleware/auth.middleware.js";

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
router.post("/grade/predict", isAuth, predictGradeEndpoint);
router.get("/cycle-time", isAuth, getCycleTime);

// ── SWOT Analysis ──────────────────────────────────────────────────────
router.get("/swot/:examType", isAuth, getSWOTAnalysis);
router.get("/subject/:name", isAuth, getSubjectStats);
router.get("/revision-schedule", isAuth, getRevisionSchedule);

// ── GPA Calculator ─────────────────────────────────────────────────────
router.get("/gpa", isAuth, getGPA);
router.post("/gpa/what-if", isAuth, getWhatIfGPA);
router.post("/gpa/course", isAuth, addCourse);
router.put("/gpa/course/:id", isAuth, updateCourse);
router.delete("/gpa/course/:id", isAuth, deleteCourse);

// ── Grade Entries ──────────────────────────────────────────────────────
router.post("/grade-entry", isAuth, addGradeEntry);
router.get("/grade-entries", isAuth, getGradeEntries);
router.put("/grade-entry/:id", isAuth, updateGradeEntry);
router.delete("/grade-entry/:id", isAuth, deleteGradeEntry);

// ── Focus & Time Leakage ──────────────────────────────────────────────
router.get("/focus/leakage", isAuth, getTimeLeakage);
router.get("/focus/peak-window", isAuth, getPeakWindow);
router.get("/performance/:examType", isAuth, getPredictivePerformanceEndpoint);
router.get("/notifications/intelligence", isAuth, getNotificationIntelligence);
router.get("/notifications/context", isAuth, getActiveContextSignals);

// ── Events ─────────────────────────────────────────────────────────────
router.post("/events/task-completed", handleTaskCompletedEvent);
// ── BFF ────────────────────────────────────────────────────────────
router.get("/dashboard-summary", isAuth, getDashboardSummary);
router.get("/strategic-summary", isAuth, getStrategicSummary);
// ── Internal service-to-service helpers ────────────────────────────────
router.get("/internal/consistency", getInternalConsistency);

export default router;