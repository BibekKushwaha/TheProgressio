import type { Request, Response } from "express";
import { createTaskFromText } from "./task.controller.js";
import {
    extractWhatsAppInbound,
    isWhatsAppCaptureAuthorized,
    isWhatsAppVerificationValid,
    resolveWhatsAppUserId,
} from "../services/whatsapp.service.js";

export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && isWhatsAppVerificationValid(token)) {
        return res.status(200).send(typeof challenge === "string" ? challenge : "");
    }

    return res.status(403).json({ message: "WhatsApp webhook verification failed" });
};

export const captureWhatsAppTask = async (req: Request, res: Response) => {
    try {
        const secretHeader = req.headers["x-whatsapp-secret"];
        if (!isWhatsAppCaptureAuthorized(Array.isArray(secretHeader) ? secretHeader[0] : secretHeader)) {
            return res.status(401).json({ message: "Unauthorized WhatsApp capture request" });
        }

        const inbound = extractWhatsAppInbound(req.body);
        if (!inbound.text) {
            return res.status(400).json({ message: "No parseable text message found in payload" });
        }

        const userId = resolveWhatsAppUserId({
            explicitUserId: inbound.explicitUserId,
            sender: inbound.sender,
        });

        if (!userId) {
            return res.status(400).json({
                message: "User could not be resolved. Provide body.userId or configure WHATSAPP_NUMBER_USER_MAP.",
            });
        }

        const { task, parsedData } = await createTaskFromText({
            userId,
            text: inbound.text,
            source: "whatsapp-capture",
            metadata: inbound.sender ? { sender: inbound.sender } : {},
        });

        return res.status(201).json({
            message: "Task captured from WhatsApp",
            task,
            parsedMeta: parsedData,
        });
    } catch (error) {
        console.error("WhatsApp capture error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
