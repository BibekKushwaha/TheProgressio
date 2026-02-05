import { Router } from "express";
import {
    createHabit,
    deleteHabit,
    getAllHabits,
    getHabitStats,
    logHabitCompletion,
    updateHabit,
    resetHabit,
} from "../controllers/habit.controller.js";

const router = Router();

// Create Habit
router.post("/", createHabit);

// Log Completion
router.post("/:id/log", logHabitCompletion);

// Get All Habits
router.get("/", getAllHabits);

// Get Habit Stats (Calendar Heatmap data)
router.get("/:id/stats", getHabitStats);

// Update Habit
router.put("/:id", updateHabit);

// Delete Habit
router.delete("/:id", deleteHabit);

// Reset Habit Streak (admin/testing only)
router.post("/:id/reset", resetHabit);

export default router;