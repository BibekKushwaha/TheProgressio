type PlainObject = Record<string, unknown>;

export interface WhatsAppInbound {
    text: string | null;
    sender: string | null;
    explicitUserId: string | null;
}

const asObject = (value: unknown): PlainObject | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as PlainObject;
};

const toStringValue = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

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
    if (!root) return { text: null, sender: null, explicitUserId: null };

    // Direct payload mode for internal callers:
    // { userId, text, from }
    const directText = toStringValue(root.text);
    const directUserId = toStringValue(root.userId);
    const directSender = toStringValue(root.from);
    if (directText) {
        return {
            text: directText,
            sender: directSender,
            explicitUserId: directUserId,
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
    const textContainer = firstMessage ? asObject(firstMessage.text) : null;

    const text = textContainer ? toStringValue(textContainer.body) : null;
    const sender = firstMessage ? toStringValue(firstMessage.from) : null;

    return {
        text,
        sender,
        explicitUserId: directUserId,
    };
};

export const resolveWhatsAppUserId = (params: {
    explicitUserId: string | null;
    sender: string | null;
}): string | null => {
    if (params.explicitUserId) return params.explicitUserId;

    const sender = normalizePhone(params.sender);
    if (!sender) return null;

    const mapping = readUserMapping();
    return mapping[sender] ?? null;
};

export const isWhatsAppCaptureAuthorized = (secretHeader: unknown): boolean => {
    const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!expected) return true;
    return secretHeader === expected;
};

export const isWhatsAppVerificationValid = (token: unknown): boolean => {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!expected) return false;
    return token === expected;
};
