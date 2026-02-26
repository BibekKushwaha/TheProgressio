import express from "express";
import {
  createMentorAlertSubscription,
  createMentorFeedback,
  listMentorAlertSubscriptions,
  listMentorFeedback,
  revokeMentorAlertSubscription,
  updateMentorAlertSubscription,
} from "../controllers/mentorship.controller.js";
import { enforceReadOnlyWrites } from "../middleware/auth.middleware.js";

const router = express.Router();

// Student-owned subscription management (share links cannot write here).
router.get("/subscriptions", listMentorAlertSubscriptions);
router.post("/subscriptions", createMentorAlertSubscription);
router.patch("/subscriptions/:id", updateMentorAlertSubscription);
router.delete("/subscriptions/:id", revokeMentorAlertSubscription);

// Student view of received mentor notes
router.get("/feedback", listMentorFeedback);

// Mentor feedback: allow write when share-link permission is FEEDBACK / FULL_ACCESS
router.post("/feedback", enforceReadOnlyWrites({ allowShareWritesFor: ["FEEDBACK", "FULL_ACCESS"] }), createMentorFeedback);

export default router;

