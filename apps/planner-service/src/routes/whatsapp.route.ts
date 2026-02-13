import express from "express";
import { captureWhatsAppTask, verifyWhatsAppWebhook } from "../controllers/whatsapp.controller.js";

const router = express.Router();

// Meta verification handshake
router.get("/webhook", verifyWhatsAppWebhook);

// Accept direct capture or Meta webhook payloads
router.post("/capture", captureWhatsAppTask);
router.post("/webhook", captureWhatsAppTask);

export default router;
