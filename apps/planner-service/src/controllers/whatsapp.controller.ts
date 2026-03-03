import type { Request, Response } from "express";
import { prisma, Status } from "@repo/db";
import {
    whatsappCaptureSchema,
    whatsappOutcomeNudgeSchema,
    whatsappTaskReminderSchema,
    whatsappTemplateMessageSchema,
} from "@repo/schemas/whatsapp";
import { aiService, getAiCircuitBreakerState, isAiKillSwitchActive, setAiKillSwitch } from "../services/ai.service.js";
import { createTaskFromText, runTaskCompletionSideEffects } from "./task.controller.js";
import {
    extractWhatsAppInbound,
    isWhatsAppCaptureAuthorized,
    isWhatsAppMetaSignatureValid,
    isWhatsAppMessageAlreadyProcessed,
    isWhatsAppTimestampStale,
    markWhatsAppMessageProcessed,
    resolveWhatsAppOcr,
    isWhatsAppVerificationValid,
    resolveWhatsAppTranscript,
    resolveWhatsAppUserId,
    checkWhatsAppPhoneRateLimit,
    recordWhatsAppAbuseSignal,
    isWhatsAppPhoneBlocked,
} from "../services/whatsapp.service.js";
import {
    logWhatsAppAuditEvent,
    getWhatsAppMetrics,
    recordIntentLatency,
    getIntentLatencyMetrics,
    logShadowModerationEvent,
    incrementWhatsAppMetric,
} from "../services/whatsapp-audit.service.js";
import {
    sendWhatsAppInteractiveButtons,
    sendWhatsAppTemplate,
    sendWhatsAppText,
} from "../services/meta-whatsapp.service.js";
import { runSilentWatchSweep } from "../services/whatsapp-watch.service.js";
import { TryCatch } from "../utils/tryCatch.js";
import ErrorHandler from "../utils/errorHandler.js";

type CaptureSource = "internal" | "meta";

// ── Prometheus metric help text ───────────────────────────────────────────────
// Descriptions are stable — changing them would break dashboards that parse
// Prometheus # HELP lines.  Add new entries here when new counters are minted.
const PROMETHEUS_METRIC_HELP: Record<string, string> = {
    wa_total:                  'Total WhatsApp inbound webhook messages processed',
    wa_task_created:           'Tasks successfully persisted from WhatsApp messages',
    wa_paired:                 'Successful PAIR-XXXXXX handshakes',
    wa_rate_limited:           'Inbound messages rejected by the per-phone rate limiter',
    wa_rate_throttled:         'Inbound messages that hit a progressive throttle warning',
    wa_abuse_blocked:          'Inbound messages rejected because the phone is block-listed',
    wa_duplicate:              'Meta retry wamids that were already processed (idempotency)',
    wa_stale_timestamp:        'Inbound messages rejected as replay-attack candidates',
    wa_parse_failed:           'Inbound payloads that failed Zod schema validation',
    wa_low_confidence:         'AI extractions with confidence below 0.6',
    wa_non_create_intent:      'Messages classified as non-create intents (reschedule/complete/list/help)',
    wa_sanitized_empty:        'Messages that were empty after injection-pattern removal',
    wa_unsupported_message:    'Inbound messages with no parseable text (sticker/reaction/etc.)',
    wa_pairing_conflict:       'Pairing attempts rejected due to number already linked',
    wa_unknown_phone:          'Inbound messages from unpaired phone numbers',
    wa_interactive_action:     'Interactive button replies handled',
    wa_error:                  'Unhandled exceptions in the inbound processing pipeline',
    wa_shadow_moderation:      'Messages where sanitization stripped injection patterns (non-blocking)',
    wa_injection_attempt:      'Messages where at least one named injection pattern was matched',
    wa_outbound_success:       'Outbound Cloud API calls that succeeded',
    wa_outbound_failure:       'Outbound Cloud API calls that failed',
    wa_outbound_text:          'Outbound plain-text messages sent',
    wa_outbound_template:      'Outbound template messages sent',
    wa_outbound_interactive:   'Outbound interactive button messages sent',
    wa_delivery_sent:          'Delivery status confirmations: sent (accepted by Meta)',
    wa_delivery_delivered:     'Delivery status confirmations: delivered to device',
    wa_delivery_read:          'Delivery status confirmations: read by recipient',
    wa_delivery_failed:        'Delivery status confirmations: failed to deliver',
};

/**
 * Extract delivery/read status strings from a raw Meta Cloud API webhook payload.
 * Meta batches multiple status events into a single webhook call.  Returns an
 * array like ['delivered', 'read'] — only known status values are included.
 */
const extractDeliveryStatuses = (body: unknown): string[] => {
    if (!body || typeof body !== 'object') return [];
    const entry = (body as Record<string, unknown>).entry;
    if (!Array.isArray(entry)) return [];
    const statuses: string[] = [];
    for (const e of entry as unknown[]) {
        const changes = (e as any)?.changes;
        if (!Array.isArray(changes)) continue;
        for (const change of changes as unknown[]) {
            const statusList = (change as any)?.value?.statuses;
            if (!Array.isArray(statusList)) continue;
            for (const s of statusList as unknown[]) {
                const st = typeof (s as any)?.status === 'string'
                    ? (s as any).status.toLowerCase()
                    : null;
                if (st && ['sent', 'delivered', 'read', 'failed'].includes(st)) {
                    statuses.push(st);
                }
            }
        }
    }
    return statuses;
};

const normalizePhoneDigits = (value: string | null): string | null => {
    if (!value) return null;
    const digits = value.replace(/[^\d]/g, "");
    return digits.length > 0 ? digits : null;
};

const ensureAuthorized = (req: Request) => {
    const secretHeader = req.headers["x-whatsapp-secret"];
    if (!isWhatsAppCaptureAuthorized(Array.isArray(secretHeader) ? secretHeader[0] : secretHeader)) {
        throw new ErrorHandler(401, "Unauthorized WhatsApp capture request");
    }
};

const ensureMetaWebhookAuthorized = (req: Request) => {
    const signatureHeader = req.headers["x-hub-signature-256"];
    const signatureValue = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const ok = isWhatsAppMetaSignatureValid({ signatureHeader: signatureValue, rawBody: req.rawBody });
    if (!ok) {
        throw new ErrorHandler(401, "Unauthorized WhatsApp webhook request");
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

const getIntentGuidanceMessage = (intent: "reschedule_task" | "complete_task" | "list_tasks" | "help") => {
    if (intent === "reschedule_task") {
        return "I can reschedule tasks soon. For now, send a new reminder like: 'Revise physics tomorrow 7pm'.";
    }
    if (intent === "complete_task") {
        return "To mark done quickly, use task reminder buttons from app notifications. I’ll support text-based completion soon.";
    }
    if (intent === "list_tasks") {
        return "Open Study OS dashboard for your full task list. I’ll add WhatsApp list view support soon.";
    }
    return "Send me a task like 'Math worksheet tomorrow 6pm' and I’ll add it.";
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

const captureWhatsAppTaskCore = async (req: Request, res: Response, source: CaptureSource) => {
    const startedAt = Date.now();

    // ── Outbound delivery confirmation webhook handling ─────────────────────
    // Meta sends delivery/read status updates through the same webhook endpoint
    // as inbound messages.  These are NOT user messages — they confirm that a
    // previously sent outbound message reached the recipient.  We increment
    // per-status counters (wa_delivery_delivered, wa_delivery_read, …) and
    // acknowledge immediately without running the full inbound pipeline.
    if (source === 'meta') {
        const deliveryStatuses = extractDeliveryStatuses(req.body);
        if (deliveryStatuses.length > 0) {
            for (const status of deliveryStatuses) {
                incrementWhatsAppMetric(`wa_delivery_${status}`);
            }
            return res.status(200).json({ message: 'Delivery status acknowledged', count: deliveryStatuses.length });
        }
    }

    const parsedPayload = whatsappCaptureSchema.safeParse(req.body ?? {});
    if (!parsedPayload.success) {
        if (source === "meta") {
            logWhatsAppAuditEvent({
                ts: new Date().toISOString(),
                messageId: null,
                phoneSuffix: null,
                userId: null,
                outcome: "parse_failed",
                source,
                durationMs: Date.now() - startedAt,
            });
            return res.status(200).json({ message: "Ignored invalid WhatsApp webhook payload" });
        }
        throw new ErrorHandler(400, "Invalid WhatsApp payload");
    }

    const inbound = extractWhatsAppInbound(parsedPayload.data);
    const normalizedSender = normalizePhoneDigits(inbound.sender);
    const phoneSuffix = normalizedSender ? normalizedSender.slice(-4) : null;

    // Shared audit emitter — captures common fields via closure so every
    // terminal return point only needs to specify what's unique to it.
    let resolvedUserId: string | null = null;
    const emitAudit = (
        event: Omit<Parameters<typeof logWhatsAppAuditEvent>[0], "ts" | "source" | "messageId" | "phoneSuffix" | "userId" | "durationMs">,
    ) => {
        logWhatsAppAuditEvent({
            ts: new Date().toISOString(),
            messageId: inbound.messageId,
            phoneSuffix,
            userId: resolvedUserId,
            source,
            durationMs: Date.now() - startedAt,
            ...event,
        });
    };

    // Meta webhooks include non-message events (e.g. status updates). Acknowledge them to avoid retries.
    if (
        source === "meta" &&
        !normalizedSender &&
        !inbound.text &&
        !inbound.interactiveReplyId &&
        !inbound.audioMessageId &&
        !inbound.imageMessageId &&
        !inbound.transcript
    ) {
        return res.status(200).json({ message: "Ignored non-message webhook" });
    }

    // ── Abuse block check (fast path) ──────────────────────────────────────
    // Blocked phones are rejected before any DB or AI work so the overhead
    // is a single Redis GET per request.
    if (normalizedSender) {
        const blocked = await isWhatsAppPhoneBlocked(normalizedSender);
        if (blocked) {
            emitAudit({ outcome: "abuse_blocked", abuseFlagReason: "phone_blocked" });
            if (source === "meta") {
                return res.status(200).json({ message: "Blocked" });
            }
            throw new ErrorHandler(429, "Too many invalid requests from this number");
        }
    }

    // ── Per-phone inbound rate limit (adaptive / progressive throttling) ────
    // Tier 0 (< 50 %): pass through silently.
    // Tier 1 (50–74 %): allow but track for observability.
    // Tier 2 (75–89 %): allow but warn the user to slow down.
    // Tier 3 (≥ 90 % / over limit): hard block — reject the message.
    if (normalizedSender) {
        const rateResult = await checkWhatsAppPhoneRateLimit(normalizedSender);
        if (rateResult.throttleTier === 3) {
            emitAudit({ outcome: "rate_limited" });
            if (source === "meta") {
                await sendWhatsAppText(
                    normalizedSender,
                    "⏳ You're sending messages too quickly. Please wait a moment before sending another task.",
                ).catch(() => null);
                return res.status(200).json({ message: "Rate limited" });
            }
            throw new ErrorHandler(429, "Rate limit exceeded. Please try again later.");
        }
        if (rateResult.throttleTier === 2 && source === "meta") {
            // Soft warning — request still processed, but user is alerted
            await sendWhatsAppText(
                normalizedSender,
                "⚡ Heads up: you're sending tasks quickly. I'll keep adding them, but please slow down to avoid a temporary pause.",
            ).catch(() => null);
        }
        if (rateResult.throttleTier >= 1) {
            incrementWhatsAppMetric('wa_rate_throttled');
        }
    }

    // ── Replay-attack protection (Meta webhooks only) ──────────────────────
    // Reject messages whose timestamp is older than WHATSAPP_TIMESTAMP_MAX_AGE_S
    // (default 5 minutes). Meta delivers webhooks almost instantly; anything
    // older is either a replay or a severely delayed delivery we should drop.
    if (source === "meta" && inbound.messageTimestamp !== null && isWhatsAppTimestampStale(inbound.messageTimestamp)) {
        emitAudit({ outcome: "stale_timestamp" });
        console.warn(
            `[WhatsApp] Stale timestamp rejected: messageId=${inbound.messageId ?? "?"} ts=${inbound.messageTimestamp}`,
        );
        return res.status(200).json({ message: "Ignored stale WhatsApp webhook (replay protection)" });
    }

    // ── Idempotency guard (Meta webhooks only) ─────────────────────────────
    // Meta will retry a webhook if our endpoint doesn't respond with 2xx in time.
    // Without this check, a retry would create a duplicate task. We check-then-
    // mark using the unique wamid; a concurrent insert is safe (P2002 ignored).
    if (source === "meta" && inbound.messageId) {
        const alreadyProcessed = await isWhatsAppMessageAlreadyProcessed(inbound.messageId);
        if (alreadyProcessed) {
            emitAudit({ outcome: "duplicate" });
            return res.status(200).json({ message: "Duplicate WhatsApp message ignored" });
        }
        // Mark as processed immediately so concurrent retries from Meta are
        // rejected even if our processing below takes a few hundred ms.
        await markWhatsAppMessageProcessed(inbound.messageId);
    }

    const userId = await resolveWhatsAppUserId({
        explicitUserId: inbound.explicitUserId,
        sender: normalizedSender ?? inbound.sender,
    });
    resolvedUserId = userId;

    if (!userId) {
        // If no user found, check if it's a pairing attempt
        const transcription = await resolveWhatsAppTranscript(inbound);
        const ocr = await resolveWhatsAppOcr(inbound);
        const messageText = (inbound.text ?? transcription.transcript ?? ocr.text)?.trim();

        if (messageText && messageText.startsWith("PAIR-")) {
            const pairingCode = messageText;
            const user = await prisma.user.findUnique({
                where: { whatsappPairingCode: pairingCode },
            });

            if (user) {
                if (!normalizedSender) {
                    return res.status(400).json({
                        success: false,
                        message: "Missing sender phone number in webhook payload",
                    });
                }

                // ── Pre-flight: check the sender number isn't already owned by a DIFFERENT user.
                // This gives a clear error message before we hit the DB unique constraint.
                const conflictingUser = await prisma.user.findUnique({
                    where: { whatsappNumber: normalizedSender },
                    select: { id: true },
                });
                if (conflictingUser && conflictingUser.id !== user.id) {
                    emitAudit({ outcome: "pairing_conflict" });
                    await sendWhatsAppText(
                        normalizedSender,
                        "⚠️ This WhatsApp number is already linked to another Study OS account. Please unpair it from that account first (Settings → WhatsApp Bot → Unlink), then try again.",
                    ).catch(() => null);
                    return res.status(400).json({
                        success: false,
                        message: "WhatsApp number already paired to a different account",
                    });
                }

                // Detect re-pair (user is swapping from an old number to this one).
                const isNumberChange =
                    user.whatsappVerified &&
                    user.whatsappNumber !== null &&
                    user.whatsappNumber !== normalizedSender;

                try {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            whatsappNumber: normalizedSender,
                            whatsappVerified: true,
                            whatsappPairingCode: null, // Consume code so it can't be reused
                        },
                    });
                } catch (error) {
                    // P2002 should be eliminated by the pre-flight check above; guard anyway.
                    const isUniqueViolation = (error as { code?: string } | null)?.code === "P2002";
                    await sendWhatsAppText(
                        normalizedSender,
                        isUniqueViolation
                            ? "⚠️ This WhatsApp number is already linked to another account."
                            : "⚠️ Pairing failed due to a server error. Please try again in a minute.",
                    ).catch(() => null);
                    emitAudit({ outcome: "pairing_conflict" });
                    return res.status(400).json({
                        success: false,
                        message: isUniqueViolation ? "WhatsApp number already paired" : "WhatsApp pairing failed",
                    });
                }

                const confirmText = isNumberChange
                    ? "✅ Your WhatsApp number has been updated successfully.\n\nYour old number has been unlinked. This number is now your Study OS assistant."
                    : "🎉 Welcome to Study OS! Pairing successful.\n\n" +
                      "I am your AI study assistant. You can:\n" +
                      "✅ Send me tasks like 'Math HW at 6pm'\n" +
                      "🖼️ Send a photo of your syllabus to sync it\n" +
                      "🎤 Send a voice note for brainstorming";

                await sendWhatsAppText(normalizedSender, confirmText).catch(() => null);

                resolvedUserId = user.id;
                emitAudit({ outcome: "paired" });

                return res.status(200).json({
                    success: true,
                    message: "User paired successfully via WhatsApp",
                    userId: user.id,
                });
            }
        }

        // Unpaired phone sending a non-pairing message — record an abuse signal.
        // Bots, wrong-number senders and scrapers do this repeatedly.
        if (normalizedSender && messageText && !messageText.startsWith("PAIR-")) {
            await recordWhatsAppAbuseSignal(normalizedSender);
        }

        if (source === "meta" && normalizedSender) {
            emitAudit({ outcome: "unknown_phone" });
            await sendWhatsAppText(
                normalizedSender,
                "👋 To get started, open Study OS → Settings → WhatsApp Bot and send me the pairing code shown there (it looks like PAIR-XXXXXX).",
            ).catch(() => null);
            return res.status(200).json({ success: true, message: "User not paired; instructions sent" });
        }

        emitAudit({ outcome: "unknown_phone" });
        throw new ErrorHandler(
            400,
            "User not found. If this is your first time, send 'PAIR-XXXXXX' using the code from your app settings.",
        );
    }

    if (inbound.interactiveReplyId) {
        const actionResult = await handleInteractiveAction({
            userId,
            actionId: inbound.interactiveReplyId,
            sender: normalizedSender ?? inbound.sender,
        });
        emitAudit({ outcome: "interactive_action" });
        return res.status(actionResult.status).json(actionResult.body);
    }

    const transcription = await resolveWhatsAppTranscript(inbound);
    const ocr = await resolveWhatsAppOcr(inbound);
    const messageText = inbound.text ?? transcription.transcript ?? ocr.text;

    if (!messageText) {
        if (source === "meta") {
            emitAudit({ outcome: "unsupported_message" });
            return res.status(200).json({ message: "Ignored unsupported WhatsApp webhook payload" });
        }
        throw new ErrorHandler(400, "No parseable text message found in payload");
    }

    const { text: safeText, matchedPatterns } = aiService.sanitizeIncomingTextWithMetadata(messageText);

    // ── Shadow moderation — log injection-pattern hits without blocking ────
    // When patterns are stripped from an otherwise valid message we emit a
    // forensic log entry for security analysis but continue processing.  This
    // gives visibility into probing attempts (e.g. prompt-injection tests)
    // without degrading the experience of real users whose messages happen to
    // trigger broad patterns like 'system:' in context.
    if (matchedPatterns.length > 0) {
        logShadowModerationEvent({
            ts:              new Date().toISOString(),
            messageId:       inbound.messageId,
            phoneSuffix,
            userId:          resolvedUserId,
            matchedPatterns,
            originalLength:  messageText.length,
            sanitizedLength: safeText.length,
            source,
        });
    }

    if (!safeText) {
        // Empty after sanitization — text was entirely injection patterns.
        // Record an abuse signal so repeat offenders get blocked.
        if (normalizedSender) {
            await recordWhatsAppAbuseSignal(normalizedSender);
            await sendWhatsAppText(normalizedSender, "Please send a valid task message. Example: 'Chemistry revision tomorrow 7pm'.");
        }
        emitAudit({ outcome: "sanitized_empty" });
        return res.status(200).json({ message: "Ignored empty or unsafe WhatsApp message" });
    }

    const aiStart    = Date.now();
    const extracted  = await aiService.extractWhatsAppIntentAndTask(safeText);
    recordIntentLatency(extracted.intent, Date.now() - aiStart);

    if (extracted.intent !== "create_task") {
        if (normalizedSender) {
            await sendWhatsAppText(
                normalizedSender,
                getIntentGuidanceMessage(extracted.intent),
            ).catch(() => null);
        }
        emitAudit({ outcome: "non_create_intent", intent: extracted.intent, confidence: extracted.confidence });
        return res.status(200).json({ message: "Non-create intent handled", intent: extracted.intent });
    }

    const intent = extracted.intent;
    const dueDate = extracted.dueAt ? new Date(extracted.dueAt) : null;
    const hasPastDueDate = !!dueDate && dueDate.getTime() < Date.now();

    if (extracted.confidence < 0.6 || !extracted.title.trim()) {
        if (normalizedSender) {
            await sendWhatsAppText(
                normalizedSender,
                "What exact time should I set for this task?",
            ).catch(() => null);
        }
        emitAudit({ outcome: "low_confidence", intent: extracted.intent, confidence: extracted.confidence });
        return res.status(200).json({
            message: "Clarification required before creating task",
            confidence: extracted.confidence,
            hasPastDueDate,
        });
    }

    const { task, parsedData } = await createTaskFromText({
        userId,
        text: safeText,
        source: inbound.text ? "whatsapp-capture" : transcription.transcript ? "whatsapp-capture-voice" : "whatsapp-capture-ocr",
        parsedDataOverride: {
            title: extracted.title.slice(0, 120),
            ...(!hasPastDueDate && dueDate ? { dueDate } : {}),
            isRecurring: !!extracted.recurrence,
        },
        metadata: {
            intent,
            aiTaskExtraction: {
                title: extracted.title,
                dueAt: extracted.dueAt,
                recurrence: extracted.recurrence,
                confidence: extracted.confidence,
                source: extracted.source,
                hadPastDueDate: hasPastDueDate,
            },
            ...(normalizedSender ? { sender: normalizedSender } : inbound.sender ? { sender: inbound.sender } : {}),
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

    emitAudit({ outcome: "task_created", intent, confidence: extracted.confidence, taskId: task.id });

    return res.status(201).json({
        message: "Task captured from WhatsApp",
        task,
        parsedMeta: parsedData,
    });
};

export const captureWhatsAppTaskInternal = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);
    return captureWhatsAppTaskCore(req, res, "internal");
});

export const captureWhatsAppTaskWebhook = TryCatch(async (req: Request, res: Response) => {
    ensureMetaWebhookAuthorized(req);
    return captureWhatsAppTaskCore(req, res, "meta");
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

export const getWhatsAppInboundMetrics = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const [metrics, intentLatency, killSwitchActive] = await Promise.all([
        getWhatsAppMetrics(),
        getIntentLatencyMetrics(),
        isAiKillSwitchActive(),
    ]);
    return res.status(200).json({
        generatedAt:      new Date().toISOString(),
        metrics,
        intentLatency,
        aiCircuitBreaker: getAiCircuitBreakerState(),
        aiKillSwitch:     killSwitchActive,
    });
});

/**
 * GET /api/integrations/whatsapp/metrics/prometheus
 *
 * Exports all WhatsApp metrics in Prometheus text exposition format (v0.0.4)
 * so the endpoint can be scraped directly by a Prometheus server, Grafana
 * Agent, or any compatible collector without a side-car adapter.
 *
 * Protected by the internal `x-whatsapp-secret` header.
 */
export const getWhatsAppPrometheusMetrics = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const metrics = await getWhatsAppMetrics();

    const lines: string[] = [
        `# HELP wa_scrape_timestamp_seconds Unix timestamp of this scrape`,
        `# TYPE wa_scrape_timestamp_seconds gauge`,
        `wa_scrape_timestamp_seconds ${Math.floor(Date.now() / 1000)}`,
        '',
    ];

    for (const [key, value] of Object.entries(metrics)) {
        const help = PROMETHEUS_METRIC_HELP[key] ?? `WhatsApp metric: ${key}`;
        // All WhatsApp metrics are monotonically increasing counters
        const metricType = key.startsWith('wa_delivery_') || key === 'wa_rate_throttled'
            ? 'counter'
            : 'counter';
        lines.push(`# HELP ${key} ${help}`);
        lines.push(`# TYPE ${key} ${metricType}`);
        lines.push(`${key} ${value}`);
        lines.push('');
    }

    // Circuit breaker state as a gauge (0=closed, 1=open, 2=half-open)
    const cbState = getAiCircuitBreakerState();
    const cbStateNum = cbState.state === 'open' ? 1 : cbState.state === 'half-open' ? 2 : 0;
    lines.push(`# HELP wa_ai_circuit_breaker_state AI circuit breaker state (0=closed 1=open 2=half-open)`);
    lines.push(`# TYPE wa_ai_circuit_breaker_state gauge`);
    lines.push(`wa_ai_circuit_breaker_state ${cbStateNum}`);
    lines.push('');
    lines.push(`# HELP wa_ai_circuit_breaker_failures Total AI call failures contributing to circuit state`);
    lines.push(`# TYPE wa_ai_circuit_breaker_failures gauge`);
    lines.push(`wa_ai_circuit_breaker_failures ${cbState.failureCount}`);
    lines.push('');

    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.status(200).send(lines.join('\n'));
});

/**
 * POST /api/integrations/whatsapp/ai/killswitch
 *
 * Enable or disable the global AI extraction kill-switch.
 * When enabled, ALL LLM calls in `extractWhatsAppIntentAndTask` are bypassed
 * and rule-based results are returned.  The system remains functional in a
 * degraded-but-safe mode — useful during AI provider outages or incidents.
 *
 * Body: { "enabled": true | false }
 * Protected by the internal `x-whatsapp-secret` header.
 */
export const toggleAiKillSwitch = TryCatch(async (req: Request, res: Response) => {
    ensureAuthorized(req);
    const body    = (req.body ?? {}) as Record<string, unknown>;
    const enabled = body.enabled === true || body.enabled === 'true' || body.enabled === 1;
    await setAiKillSwitch(enabled);
    process.stdout.write(JSON.stringify({
        service:   'planner-service',
        subsystem: 'whatsapp_admin',
        level:     'warn',
        ts:        new Date().toISOString(),
        event:     'ai_killswitch_toggled',
        enabled,
    }) + '\n');
    return res.status(200).json({
        message:    `AI extraction kill-switch ${enabled ? 'ENABLED' : 'DISABLED'}`,
        killSwitch: enabled,
    });
});
