import { Router } from "express";
import { isAuth } from "../middleware/auth.middleware.js";
import { logSession } from "../controllers/activity.controller.js";


const router = Router();

// Activity
router.post("/activity/log", isAuth, logSession);
// Events

export default router;