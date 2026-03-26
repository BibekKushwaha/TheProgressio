import express from "express";
import {
	captureWhatsAppTaskInternal,
	captureWhatsAppTaskWebhook,
	getWhatsAppInboundMetrics,
	getWhatsAppPrometheusMetrics,
	sendOutcomeNudge,
	sendWhatsAppTaskReminder,
	sendWhatsAppTemplateMessage,
	toggleAiKillSwitch,
	verifyWhatsAppWebhook,
} from "../controllers/whatsapp.controller.js";

const router = express.Router();

// Meta verification handshake
router.get("/webhook", verifyWhatsAppWebhook);

// Accept direct capture or Meta webhook payloads
router.post("/capture", captureWhatsAppTaskInternal);
router.post("/webhook", captureWhatsAppTaskWebhook);
router.post("/reminders/task", sendWhatsAppTaskReminder);
router.post("/templates/send", sendWhatsAppTemplateMessage);
router.post("/nudges/outcome", sendOutcomeNudge);
// Internal observability — all require x-whatsapp-secret header
router.get("/metrics",            getWhatsAppInboundMetrics);    // JSON snapshot
router.get("/metrics/prometheus", getWhatsAppPrometheusMetrics); // Prometheus text format

// Admin controls — require x-whatsapp-secret header
// POST { "enabled": true|false } to toggle AI extraction bypass
router.post("/ai/killswitch",     toggleAiKillSwitch);

export default router;
