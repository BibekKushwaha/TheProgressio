import express from "express";
import { captureWhatsAppTask, verifyWhatsAppWebhook, registerWhatsAppNumber, verifyWhatsAppOTP } from "../controllers/whatsapp.controller.js";
import { isAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// Meta verification handshake
router.get("/webhook", verifyWhatsAppWebhook);

// Accept direct capture or Meta webhook payloads
router.post("/capture", captureWhatsAppTask);
router.post("/webhook", captureWhatsAppTask);

// Authenticated endpoints for phone registration
router.post("/register", isAuth, registerWhatsAppNumber);
router.post("/verify", isAuth, verifyWhatsAppOTP);

export default router;
