type PlainObject = Record<string, unknown>;

export interface WhatsAppInbound {
    text: string | null;
    sender: string | null;
    explicitUserId: string | null;
    messageId: string | null;
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
    if (!root) return { text: null, sender: null, explicitUserId: null, messageId: null };

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
            messageId: null,
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
    const messageId = firstMessage ? toStringValue(firstMessage.id) : null;

    return {
        text,
        sender,
        explicitUserId: directUserId,
        messageId,
    };
};

/**
 * Resolve a WhatsApp sender to a userId.
 * Priority: explicit userId → DB lookup (WhatsAppUser) → env-var mapping fallback.
 */
export const resolveWhatsAppUserId = async (params: {
    explicitUserId: string | null;
    sender: string | null;
    prisma?: any;
}): Promise<string | null> => {
    if (params.explicitUserId) return params.explicitUserId;

    const sender = normalizePhone(params.sender);
    if (!sender) return null;

    // DB-based lookup (if prisma is available)
    if (params.prisma) {
        try {
            const whatsappUser = await params.prisma.whatsAppUser.findFirst({
                where: { phoneNumber: sender, verified: true, optedIn: true },
                select: { userId: true },
            });
            if (whatsappUser) return whatsappUser.userId;
        } catch {
            // Fall through to env-var mapping
        }
    }

    // Fallback: env-var mapping
    const mapping = readUserMapping();
    return mapping[sender] ?? null;
};

/**
 * Detect slash commands from WhatsApp messages.
 * Supported: /status, /today, /help
 */
export type WhatsAppCommand = "status" | "today" | "help" | null;

export const detectCommand = (text: string | null): WhatsAppCommand => {
    if (!text) return null;
    const trimmed = text.trim().toLowerCase();
    if (trimmed === "/status" || trimmed === "status") return "status";
    if (trimmed === "/today" || trimmed === "today") return "today";
    if (trimmed === "/help" || trimmed === "help") return "help";
    return null;
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
