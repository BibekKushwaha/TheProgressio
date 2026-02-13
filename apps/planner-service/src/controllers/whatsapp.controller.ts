import type { Request, Response } from "express";
import { prisma } from "@repo/db";
import { createTaskFromText } from "./task.controller.js";
import {
    extractWhatsAppInbound,
    isWhatsAppCaptureAuthorized,
    isWhatsAppVerificationValid,
    resolveWhatsAppUserId,
    detectCommand,
} from "../services/whatsapp.service.js";
import {
    sendTextMessage,
    markMessageRead,
} from "../services/whatsapp-cloud.service.js";

type PendingWhatsAppRegistration = {
    phoneNumber: string;
    otpCode: string;
    otpExpiresAt: Date;
    verified: boolean;
    optedIn: boolean;
};

const pendingWhatsAppRegistrations = new Map<string, PendingWhatsAppRegistration>();

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

        // Mark inbound message as read (fire-and-forget)
        if (inbound.messageId) {
            markMessageRead(inbound.messageId).catch(() => {});
        }

        const userId = await resolveWhatsAppUserId({
            explicitUserId: inbound.explicitUserId,
            sender: inbound.sender,
            prisma,
        });

        if (!userId) {
            // Respond to unknown senders on WhatsApp
            if (inbound.sender) {
                sendTextMessage(
                    inbound.sender,
                    "👋 Hi! I don't recognize this number yet. Please register your WhatsApp number in the Transition app first.",
                ).catch(() => {});
            }
            return res.status(400).json({
                message: "User could not be resolved. Register via POST /api/integrations/whatsapp/register.",
            });
        }

        // Check for slash commands
        const command = detectCommand(inbound.text);
        if (command) {
            const reply = await handleSlashCommand(command, userId);
            if (inbound.sender) {
                sendTextMessage(inbound.sender, reply).catch(() => {});
            }
            return res.status(200).json({ message: "Command processed", command, reply });
        }

        // Default: NLP task creation
        const { task, parsedData } = await createTaskFromText({
            userId,
            text: inbound.text,
            source: "whatsapp-capture",
            metadata: inbound.sender ? { sender: inbound.sender } : {},
        });

        // Send confirmation back via WhatsApp
        if (inbound.sender && task) {
            const dueStr = task.dueDate
                ? ` due ${new Date(task.dueDate).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}`
                : "";
            sendTextMessage(
                inbound.sender,
                `✅ Created: *${task.title}*${dueStr}\nPriority: ${task.priority}`,
            ).catch(() => {});
        }

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

// ─── Slash Command Handler ──────────────────────────────────────────────────────

async function handleSlashCommand(command: "status" | "today" | "help", userId: string): Promise<string> {
    switch (command) {
        case "help":
            return [
                "📚 *Transition WhatsApp Bot*",
                "",
                "Just send a message like:",
                '  "Biology quiz next Friday at 9 AM p1"',
                "and I'll create a task for you!",
                "",
                "*Commands:*",
                "/today — See today's tasks",
                "/status — Quick stats overview",
                "/help — Show this message",
            ].join("\n");

        case "today": {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const tasks = await prisma.task.findMany({
                where: {
                    userId,
                    dueDate: { gte: today, lt: tomorrow },
                },
                orderBy: { priority: "desc" },
                take: 10,
            });

            if (tasks.length === 0) {
                return "🎉 No tasks due today! Enjoy your free time.";
            }

            const statusIcon: Record<string, string> = {
                PENDING: "⬜",
                IN_PROGRESS: "🔄",
                COMPLETED: "✅",
            };

            const lines = tasks.map(
                (t: any) => `${statusIcon[t.status] || "⬜"} ${t.title} (${t.priority})`,
            );
            return `📋 *Today's Tasks (${tasks.length})*\n\n${lines.join("\n")}`;
        }

        case "status": {
            const [total, completed, pending] = await Promise.all([
                prisma.task.count({ where: { userId } }),
                prisma.task.count({ where: { userId, status: "COMPLETED" } }),
                prisma.task.count({ where: { userId, status: "PENDING" } }),
            ]);

            return [
                "📊 *Quick Status*",
                "",
                `Total tasks: ${total}`,
                `✅ Completed: ${completed}`,
                `⬜ Pending: ${pending}`,
                `🔄 In Progress: ${total - completed - pending}`,
            ].join("\n");
        }
    }
}

// ─── WhatsApp Phone Registration ────────────────────────────────────────────────

export const registerWhatsAppNumber = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { phoneNumber } = req.body;

        if (!phoneNumber || typeof phoneNumber !== "string") {
            return res.status(400).json({ message: "phoneNumber is required" });
        }

        const digits = phoneNumber.replace(/[^\d]/g, "");
        if (digits.length < 10 || digits.length > 15) {
            return res.status(400).json({ message: "Invalid phone number format" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        pendingWhatsAppRegistrations.set(userId, {
            phoneNumber: digits,
            otpCode: otp,
            otpExpiresAt: otpExpiry,
            verified: false,
            optedIn: false,
        });

        // Send OTP via WhatsApp
        await sendTextMessage(digits, `🔐 Your Transition verification code is: *${otp}*\n\nExpires in 10 minutes.`);

        return res.status(200).json({ message: "OTP sent to WhatsApp number" });
    } catch (error) {
        console.error("WhatsApp registration error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const verifyWhatsAppOTP = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { otp } = req.body;

        if (!otp || typeof otp !== "string") {
            return res.status(400).json({ message: "otp is required" });
        }

        const record = pendingWhatsAppRegistrations.get(userId);

        if (!record) {
            return res.status(404).json({ message: "No pending registration found. Call /register first." });
        }

        if (record.verified) {
            return res.status(200).json({ message: "Already verified", phoneNumber: record.phoneNumber });
        }

        if (!record.otpCode || !record.otpExpiresAt) {
            return res.status(400).json({ message: "No OTP pending. Call /register first." });
        }

        if (new Date() > record.otpExpiresAt) {
            return res.status(400).json({ message: "OTP has expired. Call /register to resend." });
        }

        if (record.otpCode !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        pendingWhatsAppRegistrations.set(userId, {
            ...record,
            verified: true,
            optedIn: true,
            otpCode: "",
            otpExpiresAt: new Date(0),
        });

        // Send welcome message
        sendTextMessage(
            record.phoneNumber,
            "✅ Your WhatsApp number is now linked to Transition!\n\nJust send me a task like:\n\"Math homework due tomorrow p1\"\n\nType /help for more commands.",
        ).catch(() => {});

        return res.status(200).json({ message: "WhatsApp number verified", phoneNumber: record.phoneNumber });
    } catch (error) {
        console.error("WhatsApp OTP verification error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
