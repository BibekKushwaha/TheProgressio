import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";

const router = Router();

router.get("/", getAuditLogs);

export default router;
