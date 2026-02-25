import express from "express";
import {
	captureWhatsAppTaskInternal,
	captureWhatsAppTaskWebhook,
	sendOutcomeNudge,
	sendWhatsAppTaskReminder,
	sendWhatsAppTemplateMessage,
	triggerSilentWatch,
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
router.post("/silent-watch/sweep", triggerSilentWatch);

export default router;
