
import express from "express";
import {
    createHoliday,
    createSubject,
    createTimetableEntry,
    deleteHoliday,
    deleteSubject,
    deleteTimetableEntry,
    getDailySchedule,
    listHolidays,
    listSubjects,
    updateHoliday,
    updateTimetableEntry,
} from "../controllers/timetable.controller.js";

const router = express.Router();

// GET /timetable/daily - Get daily schedule based on rotation
router.get("/daily", getDailySchedule);

// Timetable Entry CRUD
router.post("/entries", createTimetableEntry);
router.patch("/entries/:id", updateTimetableEntry);
router.delete("/entries/:id", deleteTimetableEntry);

// Subject CRUD
router.get("/subjects", listSubjects);
router.post("/subjects", createSubject);
router.delete("/subjects/:id", deleteSubject);

router.get("/holidays", listHolidays);
router.post("/holidays", createHoliday);
router.patch("/holidays/:id", updateHoliday);
router.delete("/holidays/:id", deleteHoliday);

export default router;
