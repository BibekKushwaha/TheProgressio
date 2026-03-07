import crypto from 'crypto';
import { prisma } from "@repo/db";
import { consumeRateLimit, getRedisClient } from "@repo/cache";
import { requestJson } from "./internal-http.service.js";

type PlainObject = Record<string, unknown>;

export interface WhatsAppInbound {
    text: string | null;
    sender: string | null;
    explicitUserId: string | null;
    audioUrl: string | null;
    audioMessageId: string | null;
    imageUrl: string | null;
    imageMessageId: string | null;
    imageCaption: string | null;
    transcript: string | null;
    language: string | null;
    confidence: number | null;
    interactiveReplyId: string | null;
    interactiveReplyTitle: string | null;
    /** wamid from Meta Cloud API — used for idempotency deduplication */
    messageId: string | null;
    /** Unix epoch seconds from Meta message timestamp — used for replay-attack detection */
    messageTimestamp: number | null;
}

const asObject = (value: unknown): PlainObject | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as PlainObject;
};

const toStringValue = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const toNumberValue = (value: unknown): number | null => {
    if (typeof value !== "number" || Number.isNaN(value)) return null;
    return value;
};

const normalizePhone = (phone: string | null): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/[^\d]/g, "");
    return digits.length > 0 ? digits : null;
};

const readUserMapping = (): Record<string, string> => {
    const raw = process.env.WHATSAPP_NUMBER_USER_MAP;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }
        return parsed as Record<string, string>;
    } catch {
        console.warn("Invalid WHATSAPP_NUMBER_USER_MAP JSON; ignoring mapping.");
        return {};
    }
};

export const extractWhatsAppInbound = (payload: unknown): WhatsAppInbound => {
    const root = asObject(payload);
    if (!root) {
        return {
            text: null,
            sender: null,
            explicitUserId: null,
            audioUrl: null,
            audioMessageId: null,
            imageUrl: null,
            imageMessageId: null,
            imageCaption: null,
            transcript: null,
            language: null,
            confidence: null,
            interactiveReplyId: null,
            interactiveReplyTitle: null,
            messageId: null,
            messageTimestamp: null,
        };
    }

    // Direct payload mode for internal callers:
    // { userId, text, from, audioUrl, transcript, language, confidence }
    const directText = toStringValue(root.text);
    const directTranscript = toStringValue(root.transcript);
    const directUserId = toStringValue(root.userId);
    const directSender = toStringValue(root.from);
    const directAudioUrl = toStringValue(root.audioUrl);
    const directAudioMessageId = toStringValue(root.audioMessageId);
    const directImageUrl = toStringValue(root.imageUrl);
    const directImageMessageId = toStringValue(root.imageMessageId);
    const directImageCaption = toStringValue(root.imageCaption);
    const directLanguage = toStringValue(root.language);
    const directConfidence = toNumberValue(root.confidence);
    const directInteractiveReplyId = toStringValue(root.interactiveReplyId) ?? toStringValue(root.actionId);
    const directInteractiveReplyTitle = toStringValue(root.interactiveReplyTitle) ?? toStringValue(root.actionTitle);

    if (directText || directTranscript || directAudioUrl || directImageUrl || directInteractiveReplyId) {
        return {
            text: directText,
            sender: directSender,
            explicitUserId: directUserId,
            audioUrl: directAudioUrl,
            audioMessageId: directAudioMessageId,
            imageUrl: directImageUrl,
            imageMessageId: directImageMessageId,
            imageCaption: directImageCaption,
            transcript: directTranscript,
            language: directLanguage,
            confidence: directConfidence,
            interactiveReplyId: directInteractiveReplyId,
            interactiveReplyTitle: directInteractiveReplyTitle,
            // Internal callers don't carry wamid / timestamp
            messageId: null,
            messageTimestamp: null,
        };
    }

    // Meta WhatsApp webhook shape
    // entry[0].changes[0].value.messages[0].text.body
    const entries = Array.isArray(root.entry) ? root.entry : [];
    const firstEntry = asObject(entries[0]);
    const changes = firstEntry && Array.isArray(firstEntry.changes) ? firstEntry.changes : [];
    const firstChange = asObject(changes[0]);
    const value = firstChange ? asObject(firstChange.value) : null;
    const messages = value && Array.isArray(value.messages) ? value.messages : [];
    const firstMessage = asObject(messages[0]);
    const messageType = firstMessage ? toStringValue(firstMessage.type) : null;
    const textContainer = firstMessage ? asObject(firstMessage.text) : null;
    const audioContainer = firstMessage ? asObject(firstMessage.audio) : null;
    const imageContainer = firstMessage ? asObject(firstMessage.image) : null;
    const interactiveContainer = firstMessage ? asObject(firstMessage.interactive) : null;
    const buttonReply = interactiveContainer ? asObject(interactiveContainer.button_reply) : null;
    const listReply = interactiveContainer ? asObject(interactiveContainer.list_reply) : null;
    const transcriptions = value && Array.isArray(value.transcriptions) ? value.transcriptions : [];
    const firstTranscription = asObject(transcriptions[0]);

    const text = textContainer ? toStringValue(textContainer.body) : null;
    const transcript = firstTranscription ? toStringValue(firstTranscription.text) : null;
    const language = firstTranscription ? toStringValue(firstTranscription.language) : null;
    const confidence = firstTranscription ? toNumberValue(firstTranscription.confidence) : null;
    const sender = firstMessage ? toStringValue(firstMessage.from) : null;
    const audioMessageId = audioContainer ? toStringValue(audioContainer.id) : null;
    const audioUrl = audioContainer ? toStringValue(audioContainer.url) : null;
    const imageMessageId = imageContainer ? toStringValue(imageContainer.id) : null;
    const imageUrl = imageContainer ? toStringValue(imageContainer.link) ?? toStringValue(imageContainer.url) : null;
    const imageCaption = imageContainer ? toStringValue(imageContainer.caption) : null;
    const interactiveReplyId =
        (buttonReply ? toStringValue(buttonReply.id) : null) ??
        (listReply ? toStringValue(listReply.id) : null);
    const interactiveReplyTitle =
        (buttonReply ? toStringValue(buttonReply.title) : null) ??
        (listReply ? toStringValue(listReply.title) : null);
    // wamid — unique message identifier from Meta Cloud API
    const messageId = firstMessage ? toStringValue(firstMessage.id) : null;
    // Unix epoch seconds; Meta always provides this as a numeric string
    const rawTs = firstMessage ? firstMessage.timestamp : null;
    const messageTimestamp = typeof rawTs === "number"
        ? rawTs
        : typeof rawTs === "string" && rawTs.trim().length > 0
            ? Number(rawTs)
            : null;

    return {
        text: messageType === "text" ? text : null,
        sender,
        explicitUserId: directUserId,
        audioUrl,
        audioMessageId,
        imageUrl,
        imageMessageId,
        imageCaption,
        transcript,
        language,
        confidence,
        interactiveReplyId,
        interactiveReplyTitle,
        messageId,
        messageTimestamp,
    };
};

export const resolveWhatsAppUserId = async (params: {
    explicitUserId: string | null;
    sender: string | null;
}): Promise<string | null> => {
    if (params.explicitUserId) return params.explicitUserId;

    const sender = normalizePhone(params.sender);
    if (!sender) return null;

    // 1. Try environment mapping (priority/override)
    const mapping = readUserMapping();
    if (mapping[sender]) return mapping[sender];

    // 2. Try database lookup by whatsappNumber
    try {
        const user = await prisma.user.findUnique({
            where: { whatsappNumber: sender },
            select: { id: true }
        });
        return user?.id ?? null;
    } catch (error) {
        console.error("[WhatsApp Service] DB lookup error:", error);
        return null;
    }
};

// ─── Replay-attack / Idempotency helpers ────────────────────────────────────

/** How many seconds old a Meta webhook timestamp may be before we treat it as a replay. */
const WHATSAPP_TIMESTAMP_MAX_AGE_S = Number(
    process.env.WHATSAPP_TIMESTAMP_MAX_AGE_S ?? "300",
);

/**
 * Returns true when the message timestamp from Meta is outside the acceptable
 * freshness window, indicating a potential replay attack.
 *
 * @param timestamp - Unix epoch SECONDS as reported by Meta (firstMessage.timestamp).
 */
export const isWhatsAppTimestampStale = (timestamp: number | null): boolean => {
    if (timestamp === null || Number.isNaN(timestamp)) return false; // can't judge → allow through
    const ageSecs = Math.abs(Date.now() / 1000 - timestamp);
    return ageSecs > WHATSAPP_TIMESTAMP_MAX_AGE_S;
};

/**
 * Returns true if this wamid has already been processed, preventing
 * duplicate task creation on Meta webhook retries.
 */
export const isWhatsAppMessageAlreadyProcessed = async (
    messageId: string,
): Promise<boolean> => {
    try {
        const existing = await prisma.processedWhatsAppMessage.findUnique({
            where: { messageId },
            select: { messageId: true },
        });
        return existing !== null;
    } catch (error) {
        console.error("[WhatsApp] idempotency check failed:", error);
        return false; // fail-open: better to risk a dup than drop a real message
    }
};

/**
 * Records a wamid as processed. Silently ignores unique-constraint violations
 * so concurrent webhook deliveries for the same message ID are safe.
 */
export const markWhatsAppMessageProcessed = async (
    messageId: string,
): Promise<void> => {
    try {
        await prisma.processedWhatsAppMessage.create({ data: { messageId } });
    } catch (error) {
        const isAlreadyExists = (error as { code?: string } | null)?.code === "P2002";
        if (!isAlreadyExists) {
            console.error("[WhatsApp] failed to mark message processed:", error);
        }
    }
};

// ─── Per-phone rate limiter ──────────────────────────────────────────────────
//
// Limits how many inbound messages a single WhatsApp number can send within a
// sliding window.  Uses the shared Redis-backed `consumeRateLimit` primitive so
// limits are shared across all planner-service replicas in a cluster.
//
// Configurable via environment variables:
//   WHATSAPP_INBOUND_RATE_LIMIT      — max messages per window (default 20)
//   WHATSAPP_INBOUND_RATE_WINDOW_S   — window size in seconds  (default 60)

/**
 * Progressive throttle tier based on how close the phone is to the window limit.
 *
 *  0 → under 50 % of limit   — no action needed
 *  1 → 50–74 % of limit      — inform the user they're sending quickly
 *  2 → 75–89 % of limit      — ask the user to slow down
 *  3 → 90 %+ / over limit    — hard block (allowed = false)
 */
export type RateLimitTier = 0 | 1 | 2 | 3;

/** Check whether a phone number is within its inbound rate limit. Fail-open: if Redis is unreachable, allows the message through. */
export const checkWhatsAppPhoneRateLimit = async (
    phone: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: number; totalHits: number; throttleTier: RateLimitTier }> => {
    const limit = Math.max(1, Number(process.env.WHATSAPP_INBOUND_RATE_LIMIT ?? "20"));
    const windowSeconds = Math.max(1, Number(process.env.WHATSAPP_INBOUND_RATE_WINDOW_S ?? "60"));

    try {
        const result = await consumeRateLimit({
            key: phone,
            prefix: "wa:inbound",
            limit,
            windowSeconds,
        });

        const usageRatio = result.totalHits / limit;
        const throttleTier: RateLimitTier =
            !result.allowed || usageRatio >= 0.90 ? 3
            : usageRatio >= 0.75                  ? 2
            : usageRatio >= 0.50                  ? 1
            : 0;

        return { ...result, throttleTier };
    } catch (error) {
        console.error("[WhatsApp] Rate limit check failed (fail-open):", error);
        return { allowed: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000, totalHits: 0, throttleTier: 0 };
    }
};

// ─── Abuse detection ─────────────────────────────────────────────────────────
//
// Tracks "bad" signals from a phone number within a short window.  A signal is
// recorded when:
//   • The sender is not paired and sends non-pairing messages repeatedly
//   • The message text is empty after injection-pattern sanitization
//
// When the counter reaches WHATSAPP_ABUSE_THRESHOLD the phone is placed in a
// block list for WHATSAPP_ABUSE_BLOCK_S seconds (default 1 hour).
//
// All keys are scoped to `wa:abuse_*` so they don't pollute unrelated cache
// namespaces.  Fail-open: Redis outages never block legitimate messages.

const ABUSE_THRESHOLD    = Math.max(1, Number(process.env.WHATSAPP_ABUSE_THRESHOLD    ?? "8"));
const ABUSE_WINDOW_S     = Math.max(1, Number(process.env.WHATSAPP_ABUSE_WINDOW_S     ?? "120"));
const ABUSE_BLOCK_S      = Math.max(1, Number(process.env.WHATSAPP_ABUSE_BLOCK_S      ?? "3600"));

/**
 * Increment the abuse signal counter for a phone number and return whether the
 * phone should now be blocked.  If the threshold is reached this call also
 * persists the block entry in Redis.
 */
export const recordWhatsAppAbuseSignal = async (
    phone: string,
): Promise<{ abusive: boolean; reason: string | null }> => {
    try {
        const client = getRedisClient() as any;
        const blockKey = `wa:abuse_block:${phone}`;
        const countKey = `wa:abuse_count:${phone}`;

        // Already blocked by a previous escalation?
        const blocked = (await client.get(blockKey)) as string | null;
        if (blocked) {
            return { abusive: true, reason: "phone_blocked" };
        }

        const count: number = await client.incr(countKey);
        if (count === 1) {
            // Set the TTL on first increment so the counter self-expires.
            await client.expire(countKey, ABUSE_WINDOW_S);
        }

        if (count >= ABUSE_THRESHOLD) {
            // Escalate: place the phone in the block list.
            await client.set(blockKey, "1", { ex: ABUSE_BLOCK_S });
            return { abusive: true, reason: `flood_${count}_in_${ABUSE_WINDOW_S}s` };
        }

        return { abusive: false, reason: null };
    } catch (error) {
        console.error("[WhatsApp] Abuse signal recording failed (fail-open):", error);
        return { abusive: false, reason: null };
    }
};

/**
 * Check whether a phone number currently has an active abuse block.
 * This is the fast path — called before any processing so blocked phones
 * are dropped with minimal overhead.
 */
export const isWhatsAppPhoneBlocked = async (phone: string): Promise<boolean> => {
    try {
        const client = getRedisClient() as any;
        const blocked = (await client.get(`wa:abuse_block:${phone}`)) as string | null;
        return Boolean(blocked);
    } catch {
        return false; // fail-open: Redis outage never blocks a real user
    }
};

export const isWhatsAppCaptureAuthorized = (secretHeader: unknown): boolean => {
    const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!expected) return false; // fail closed: reject when secret not configured
    if (typeof secretHeader !== 'string' || !secretHeader) return false;
    try {
        const expBuf = Buffer.from(expected, 'utf8');
        const sigBuf = Buffer.from(secretHeader, 'utf8');
        if (expBuf.length !== sigBuf.length) return false;
        return crypto.timingSafeEqual(expBuf, sigBuf);
    } catch {
        return false;
    }
};

export const isWhatsAppVerificationValid = (token: unknown): boolean => {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!expected) return false;
    return token === expected;
};

const parseMetaSignature = (signatureHeader: unknown): string | null => {
    if (typeof signatureHeader !== "string") return null;
    const trimmed = signatureHeader.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("sha256=")) {
        return trimmed.slice("sha256=".length);
    }

    // Allow passing the raw hex signature directly (useful for tests/tools).
    return trimmed;
};

export const isWhatsAppMetaSignatureValid = (params: {
    signatureHeader: unknown;
    rawBody: Buffer | undefined;
}): boolean => {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) return false;
    if (!params.rawBody || !Buffer.isBuffer(params.rawBody)) return false;

    const providedHex = parseMetaSignature(params.signatureHeader);
    if (!providedHex) return false;
    if (!/^[0-9a-f]{64}$/i.test(providedHex)) return false;

    try {
        const expectedHex = crypto
            .createHmac("sha256", secret)
            .update(params.rawBody)
            .digest("hex");

        const expected = Buffer.from(expectedHex, "hex");
        const provided = Buffer.from(providedHex, "hex");
        if (expected.length !== provided.length) return false;
        return crypto.timingSafeEqual(expected, provided);
    } catch {
        return false;
    }
};

export interface WhatsAppTranscriptResult {
    transcript: string | null;
    language: string | null;
    confidence: number | null;
    source: "payload" | "service" | "none";
}

export interface WhatsAppOcrResult {
    text: string | null;
    language: string | null;
    confidence: number | null;
    source: "caption" | "service" | "none";
}

export const resolveWhatsAppTranscript = async (
    inbound: WhatsAppInbound
): Promise<WhatsAppTranscriptResult> => {
    if (inbound.transcript) {
        return {
            transcript: inbound.transcript,
            language: inbound.language,
            confidence: inbound.confidence,
            source: "payload",
        };
    }

    if (!inbound.audioUrl) {
        return { transcript: null, language: null, confidence: null, source: "none" };
    }

    const endpoint = process.env.WHATSAPP_TRANSCRIBE_URL;
    if (!endpoint) {
        return { transcript: null, language: null, confidence: null, source: "none" };
    }

    const result = await requestJson<unknown>({
        url: endpoint,
        method: "POST",
        body: {
            audioUrl: inbound.audioUrl,
            audioMessageId: inbound.audioMessageId,
            sender: inbound.sender,
        },
        logContext: {
            service: "planner-service",
            subsystem: "whatsapp",
            dependency: "transcription-service",
            operation: "resolve_transcript",
        },
    });

    if (!result.ok) {
        return { transcript: null, language: null, confidence: null, source: "none" };
    }

    const object = asObject(result.data);

    return {
        transcript: object ? toStringValue(object.transcript) : null,
        language: object ? toStringValue(object.language) : null,
        confidence: object ? toNumberValue(object.confidence) : null,
        source: "service",
    };
};

export const resolveWhatsAppOcr = async (
    inbound: WhatsAppInbound
): Promise<WhatsAppOcrResult> => {
    if (inbound.imageCaption) {
        return {
            text: inbound.imageCaption,
            language: inbound.language,
            confidence: inbound.confidence,
            source: "caption",
        };
    }

    if (!inbound.imageUrl) {
        return { text: null, language: null, confidence: null, source: "none" };
    }

    const endpoint = process.env.WHATSAPP_OCR_URL;
    if (!endpoint) {
        return { text: null, language: null, confidence: null, source: "none" };
    }

    const result = await requestJson<unknown>({
        url: endpoint,
        method: "POST",
        body: {
            imageUrl: inbound.imageUrl,
            imageMessageId: inbound.imageMessageId,
            sender: inbound.sender,
        },
        logContext: {
            service: "planner-service",
            subsystem: "whatsapp",
            dependency: "ocr-service",
            operation: "resolve_ocr",
        },
    });

    if (!result.ok) {
        return { text: null, language: null, confidence: null, source: "none" };
    }

    const object = asObject(result.data);

    return {
        text: object ? toStringValue(object.text) ?? toStringValue(object.ocrText) : null,
        language: object ? toStringValue(object.language) : null,
        confidence: object ? toNumberValue(object.confidence) : null,
        source: "service",
    };
};
