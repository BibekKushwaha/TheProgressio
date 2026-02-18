import express from "express";
import { markAttendance, getAttendanceHistory } from "../controllers/attendance.controller.js";
import { isAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/mark", isAuth, markAttendance);
router.get("/history", isAuth, getAttendanceHistory);

export default router;
