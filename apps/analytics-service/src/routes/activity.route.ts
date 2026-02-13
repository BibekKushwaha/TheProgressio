import { Router } from "express";
import { enforceReadOnlyWrites, isAuth } from "../middleware/auth.middleware.js";
import {
    getActiveLiveSession,
    heartbeatLiveSession,
    logSession,
    pauseLiveSession,
    resumeLiveSession,
    startLiveSession,
    stopLiveSession,
} from "../controllers/activity.controller.js";


const router = Router();

// Activity
router.post("/log", isAuth, enforceReadOnlyWrites, logSession);

// Mobile-ready live focus contract
router.get("/live/active", isAuth, getActiveLiveSession);
router.post("/live/start", isAuth, enforceReadOnlyWrites, startLiveSession);
router.patch("/live/pause", isAuth, enforceReadOnlyWrites, pauseLiveSession);
router.patch("/live/resume", isAuth, enforceReadOnlyWrites, resumeLiveSession);
router.patch("/live/heartbeat", isAuth, enforceReadOnlyWrites, heartbeatLiveSession);
router.patch("/live/stop", isAuth, enforceReadOnlyWrites, stopLiveSession);

export default router;
