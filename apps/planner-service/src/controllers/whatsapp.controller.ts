import type { Request, Response } from "express";
import { prisma, Status } from "@repo/db";
import {
    whatsappCaptureSchema,
    whatsappOutcomeNudgeSchema,
    whatsappTaskReminderSchema,
    whatsappTemplateMessageSchema,
} from "@repo/schemas/whatsapp";
import { aiService } from "../services/ai.service.js";
import { createTaskFromText, runTaskCompletionSideEffects } from "./task.controller.js";
import {
    extractWhatsAppInbound,
    isWhatsAppCaptureAuthorized,
    resolveWhatsAppOcr,
    isWhatsAppVerificationValid,
    resolveWhatsAppTranscript,
    resolveWhatsAppUserId,
} from "../services/whatsapp.service.js";
import {
    sendWhatsAppInteractiveButtons,
    sendWhatsAppTemplate,
    sendWhatsAppText,
} from "../services/meta-whatsapp.service.js";
import { runSilentWatchSweep } from "../services/whatsapp-watch.service.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

const ensureAuthorized = (req: Request) => {
    const secretHeader = req.headers["x-whatsapp-secret"];
    if (!isWhatsAppCaptureAuthorized(Array.isArray(secretHeader) ? secretHeader[0] : secretHeader)) {
        throw new ErrorHandler(401, "Unauthorized WhatsApp capture request");
    }
};

const parseAction = (actionId: string): { key: string; taskId: string | null } => {
    const [key, rawTaskId] = actionId.split(":");
    const taskId = rawTaskId && rawTaskId.trim().length > 0 ? rawTaskId : null;
    return { key: key || "", taskId };
};

const formatSubtasksMessage = (taskTitle: string, steps: string[]): string => {
    const lines = steps.slice(0, 6).map((step, index) => `${index + 1}. ${step}`);
    return [
        `✨ Breakdown for ${taskTitle}`,
        ...lines,
        "⏱️ Aim for ~20 minutes per step.",
    ].join("\n");
};

const handleInteractiveAction = async (params: {
    userId: string;
    actionId: string;
    sender: string | null;
}): Promise<{ status: number; body: Record<string, unknown> }> => {
    const { key, taskId } = parseAction(params.actionId);

    if ((key === "task_complete" || key === "task_snooze_1h" || key === "task_breakdown") && !taskId) {
        return { status: 400, body: { message: "Interactive action missing task id" } };
    }

    if (key === "task_complete" && taskId) {
        const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!existingTask || existingTask.userId !== params.userId) {
            return { status: 404, body: { message: "Task not found" } };
        }

        if (existingTask.status !== Status.COMPLETED) {
            const updatedTask = await prisma.task.update({
                where: { id: taskId },
                data: { status: Status.COMPLETED },
            });

            await runTaskCompletionSideEffects({
                taskId,
                userId: params.userId,
                title: updatedTask.title,
                categoryId: updatedTask.categoryId ?? null,
            });
        }

        if (params.sender) {
            await sendWhatsAppText(params.sender, "✅ Marked as completed. Great momentum!");
        }

        return { status: 200, body: { message: "Task marked as completed", taskId } };
    }

    if (key === "task_snooze_1h" && taskId) {
        const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!existingTask || existingTask.userId !== params.userId) {
            return { status: 404, body: { message: "Task not found" } };
        }

        const base = existingTask.dueDate ? new Date(existingTask.dueDate) : new Date();
        base.setHours(base.getHours() + 1);

        await prisma.task.update({
            where: { id: taskId },
            data: { dueDate: base },
        });

        if (params.sender) {
            await sendWhatsAppText(params.sender, `⏰ Snoozed by 1 hour. New due time: ${base.toLocaleString('en-IN')}`);
        }

        return { status: 200, body: { message: "Task snoozed", taskId, dueDate: base.toISOString() } };
    }

    if (key === "task_breakdown" && taskId) {
        const task = await prisma.task.findUnique({ where: { id: taskId }, include: { subtasks: true } });
        if (!task || task.userId !== params.userId) {
            return { status: 404, body: { message: "Task not found" } };
        }

        let steps = (task.subtasks || []).map((item) => item.title).filter(Boolean);
        if (steps.length === 0) {
            steps = await aiService.generateSubtasks(task.title, task.description || "");
            if (steps.length > 0) {
                await prisma.subTask.createMany({
                    data: steps.map((title) => ({ title, taskId: task.id, completed: false })),
                });
            }
        }

        if (params.sender) {
            await sendWhatsAppText(params.sender, formatSubtasksMessage(task.title, steps));
        }

        return { status: 200, body: { message: "Task breakdown generated", taskId, subtasks: steps } };
    }

    if (key === "premium_upgrade") {
        const upgradeUrl = process.env.WHATSAPP_PREMIUM_UPGRADE_URL || "https://your-app.example.com/pricing";
        if (params.sender) {
            await sendWhatsAppText(params.sender, `🚀 Upgrade here: ${upgradeUrl}`);
        }
        return { status: 200, body: { message: "Premium upgrade link sent" } };
    }

    return { status: 200, body: { message: "Interactive action ignored", actionId: params.actionId } };
};

export const verifyWhatsAppWebhook = (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && isWhatsAppVerificationValid(token)) {
        return res.status(200).send(challenge as string);
    }

    return res.status(403).json({ message: "WhatsApp webhook verification failed" });
};

export const captureWhatsAppTask = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);

    const parsedPayload = whatsappCaptureSchema.safeParse(req.body ?? {});
    if (!parsedPayload.success) {
        throw new ErrorHandler(400, "Invalid WhatsApp payload");
    }

    const inbound = extractWhatsAppInbound(parsedPayload.data);
    const userId = await resolveWhatsAppUserId({
        explicitUserId: inbound.explicitUserId,
        sender: inbound.sender,
    });

    if (!userId) {
        // If no user found, check if it's a pairing attempt
        const transcription = await resolveWhatsAppTranscript(inbound);
        const ocr = await resolveWhatsAppOcr(inbound);
        const messageText = (inbound.text ?? transcription.transcript ?? ocr.text)?.trim();

        if (messageText && messageText.startsWith("PAIR-")) {
            const pairingCode = messageText;
            const user = await prisma.user.findUnique({
                where: { whatsappPairingCode: pairingCode }
            });

            if (user) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        whatsappNumber: inbound.sender,
                        whatsappVerified: true,
                        whatsappPairingCode: null, // Clear after use
                    }
                });

                if (inbound.sender) {
                    await sendWhatsAppText(
                        inbound.sender,
                        "🎉 Welcome to Study OS! Pairing successful.\n\n" +
                        "I am your AI study assistant. You can:\n" +
                        "✅ Send me tasks like 'Math HW at 6pm'\n" +
                        "🖼️ Send a photo of your syllabus to sync it\n" +
                        "🎤 Send a voice note for brainstorming"
                    );
                }

                return res.status(200).json({
                    success: true,
                    message: "User paired successfully via WhatsApp",
                    userId: user.id
                });
            }
        }

        throw new ErrorHandler(400, "User not found. If this is your first time, send 'PAIR-XXXXXX' using the code from your app settings.");
    }

    if (inbound.interactiveReplyId) {
        const actionResult = await handleInteractiveAction({
            userId,
            actionId: inbound.interactiveReplyId,
            sender: inbound.sender,
        });
        return res.status(actionResult.status).json(actionResult.body);
    }

    const transcription = await resolveWhatsAppTranscript(inbound);
    const ocr = await resolveWhatsAppOcr(inbound);
    const messageText = inbound.text ?? transcription.transcript ?? ocr.text;

    if (!messageText) {
        throw new ErrorHandler(400, "No parseable text message found in payload");
    }

    const { task, parsedData } = await createTaskFromText({
        userId,
        text: messageText,
        source: inbound.text ? "whatsapp-capture" : transcription.transcript ? "whatsapp-capture-voice" : "whatsapp-capture-ocr",
        metadata: {
            ...(inbound.sender ? { sender: inbound.sender } : {}),
            ...(inbound.audioUrl ? { audioUrl: inbound.audioUrl } : {}),
            ...(inbound.audioMessageId ? { audioMessageId: inbound.audioMessageId } : {}),
            ...(inbound.imageUrl ? { imageUrl: inbound.imageUrl } : {}),
            ...(inbound.imageMessageId ? { imageMessageId: inbound.imageMessageId } : {}),
            ...(inbound.imageCaption ? { imageCaption: inbound.imageCaption } : {}),
            ...(transcription.language ? { language: transcription.language } : {}),
            ...(transcription.confidence !== null ? { transcriptionConfidence: transcription.confidence } : {}),
            ...(transcription.source !== "none" ? { transcriptionSource: transcription.source } : {}),
            ...(ocr.language ? { ocrLanguage: ocr.language } : {}),
            ...(ocr.confidence !== null ? { ocrConfidence: ocr.confidence } : {}),
            ...(ocr.source !== "none" ? { ocrSource: ocr.source } : {}),
        },
    });

    return res.status(201).json({
        message: "Task captured from WhatsApp",
        task,
        parsedMeta: parsedData,
    });
});

export const sendWhatsAppTaskReminder = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);

    const parsed = whatsappTaskReminderSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        throw new ErrorHandler(400, "to and taskId are required");
    }

    const { to, taskId } = parsed.data;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
        throw new ErrorHandler(404, "Task not found");
    }

    await sendWhatsAppInteractiveButtons({
        to,
        body: `Reminder: ${task.title}`,
        footer: "Choose a quick action",
        buttons: [
            { id: `task_complete:${task.id}`, title: "Mark as Completed" },
            { id: `task_snooze_1h:${task.id}`, title: "Snooze 1 Hour" },
            { id: `task_breakdown:${task.id}`, title: "✨ Break it down" },
        ],
    });

    return res.status(200).json({ message: "Interactive reminder sent", taskId: task.id });
});

export const sendWhatsAppTemplateMessage = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);

    const parsed = whatsappTemplateMessageSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        throw new ErrorHandler(400, "to and templateName are required");
    }

    const { to, templateName, languageCode, bodyVariables } = parsed.data;

    await sendWhatsAppTemplate({
        to,
        templateName,
        languageCode: typeof languageCode === "string" ? languageCode : "en",
        bodyVariables: Array.isArray(bodyVariables) ? bodyVariables.map((v) => String(v)) : [],
    });

    return res.status(200).json({ message: "Template message sent" });
});

export const sendOutcomeNudge = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);

    const parsed = whatsappOutcomeNudgeSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        throw new ErrorHandler(400, "to and userId are required");
    }

    const { to, userId, targetPercentile = 95, chapter } = parsed.data;

    const [totalTasks, completedTasks, nextPending] = await Promise.all([
        prisma.task.count({ where: { userId } }),
        prisma.task.count({ where: { userId, status: Status.COMPLETED } }),
        prisma.task.findFirst({
            where: { userId, status: { not: Status.COMPLETED } },
            orderBy: { dueDate: "asc" },
        }),
    ]);

    const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const nextTopic = typeof chapter === "string" && chapter.trim().length > 0
        ? chapter.trim()
        : nextPending?.title || "your next pending chapter";

    await sendWhatsAppText(
        to,
        `You've completed ${completion}% of your planned syllabus. Finish '${nextTopic}' today to stay on track for your ${targetPercentile}th percentile target.`
    );

    return res.status(200).json({ message: "Outcome nudge sent", completion });
});

export const triggerSilentWatch = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const result = await runSilentWatchSweep();
    return res.status(200).json({ message: "Silent watch sweep completed", ...result });
});
