
import express from "express";
import { getDailySchedule } from "../controllers/timetable.controller.js";

const router = express.Router();

// GET /timetable/daily - Get daily schedule based on rotation
router.get("/daily", getDailySchedule);

export default router;
