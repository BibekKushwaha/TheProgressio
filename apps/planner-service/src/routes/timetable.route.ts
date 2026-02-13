
import express from "express";
import {
    createHoliday,
    deleteHoliday,
    getDailySchedule,
    listHolidays,
    updateHoliday,
} from "../controllers/timetable.controller.js";

const router = express.Router();

// GET /timetable/daily - Get daily schedule based on rotation
router.get("/daily", getDailySchedule);
router.get("/holidays", listHolidays);
router.post("/holidays", createHoliday);
router.patch("/holidays/:id", updateHoliday);
router.delete("/holidays/:id", deleteHoliday);

export default router;
