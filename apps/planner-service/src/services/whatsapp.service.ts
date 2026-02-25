import crypto from 'crypto';
import { prisma } from "@repo/db";

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

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                audioUrl: inbound.audioUrl,
                audioMessageId: inbound.audioMessageId,
                sender: inbound.sender,
            }),
        });

        if (!response.ok) {
            return { transcript: null, language: null, confidence: null, source: "none" };
        }

        const body = await response.json() as unknown;
        const object = asObject(body);

        return {
            transcript: object ? toStringValue(object.transcript) : null,
            language: object ? toStringValue(object.language) : null,
            confidence: object ? toNumberValue(object.confidence) : null,
            source: "service",
        };
    } catch {
        return { transcript: null, language: null, confidence: null, source: "none" };
    }
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

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imageUrl: inbound.imageUrl,
                imageMessageId: inbound.imageMessageId,
                sender: inbound.sender,
            }),
        });

        if (!response.ok) {
            return { text: null, language: null, confidence: null, source: "none" };
        }

        const body = await response.json() as unknown;
        const object = asObject(body);

        return {
            text: object ? toStringValue(object.text) ?? toStringValue(object.ocrText) : null,
            language: object ? toStringValue(object.language) : null,
            confidence: object ? toNumberValue(object.confidence) : null,
            source: "service",
        };
    } catch {
        return { text: null, language: null, confidence: null, source: "none" };
    }
};
