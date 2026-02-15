import { Router } from "express";
import {
  composeNotification,
  createRevisionDripCampaign,
  getNotificationDeepLink,
  postDirectReply,
  triggerGeofencePing,
} from "../controllers/notification.controller.js";

const router = Router();

router.post("/compose", composeNotification);
router.post("/direct-reply", postDirectReply);
router.post("/drip-campaign/revision", createRevisionDripCampaign);
router.post("/geofence/ping", triggerGeofencePing);
router.get("/deeplink/:entityType/:entityId", getNotificationDeepLink);

export default router;
