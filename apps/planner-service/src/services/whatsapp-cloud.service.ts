/**
 * Meta WhatsApp Cloud API Client
 *
 * Sends text messages, template messages, and read receipts via
 * the official Meta WhatsApp Business Platform (Cloud API v21.0).
 *
 * Required env vars:
 *   WHATSAPP_PHONE_NUMBER_ID   — your WhatsApp Business phone number ID
 *   WHATSAPP_ACCESS_TOKEN      — permanent system-user token (or temporary dev token)
 *   WHATSAPP_API_VERSION       — optional, defaults to "v21.0"
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}`;

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 400;
const REQUEST_TIMEOUT_MS = Math.max(
    1_000,
    Number.parseInt(process.env.WHATSAPP_CLOUD_TIMEOUT_MS ?? "5000", 10) || 5000,
);

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface WhatsAppSendResult {
    ok: boolean;
    messageId?: string;
    error?: string;
    attempts: number;
}

interface MetaMessageResponse {
    messaging_product: string;
    contacts: Array<{ input: string; wa_id: string }>;
    messages: Array<{ id: string }>;
}

interface MetaErrorResponse {
    error?: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id?: string;
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const logCloudClientEvent = (params: {
    event: 'dependency_request_failed' | 'dependency_request_retry';
    status: number;
    reason: string;
    durationMs?: number;
    attempt?: number;
    maxRetries?: number;
    responsePreview?: string | null;
}): void => {
    console.warn(JSON.stringify({
        service: 'planner-service',
        subsystem: 'whatsapp-cloud-client',
        dependency: 'meta-whatsapp-cloud',
        operation: 'send_message',
        event: params.event,
        level: 'warn',
        method: 'POST',
        target: 'https://graph.facebook.com',
        status: params.status,
        reason: params.reason,
        ...(params.durationMs !== undefined ? { durationMs: params.durationMs } : {}),
        timeoutMs: REQUEST_TIMEOUT_MS,
        ...(params.attempt !== undefined ? { attempt: params.attempt } : {}),
        ...(params.maxRetries !== undefined ? { maxRetries: params.maxRetries } : {}),
        ...(params.responsePreview ? { responsePreview: params.responsePreview.slice(0, 160) } : {}),
        ts: new Date().toISOString(),
    }));
};

function isConfigured(): boolean {
    return Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

async function metaRequest<T>(
    path: string,
    body: Record<string, unknown>,
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();

    let response: Response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ACCESS_TOKEN}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (error) {
        clearTimeout(timeoutId);
        if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
            logCloudClientEvent({
                event: 'dependency_request_failed',
                status: 408,
                reason: 'timeout',
                durationMs: Date.now() - startedAt,
            });
            const timeoutError = new Error(`Meta WhatsApp API error: timeout after ${REQUEST_TIMEOUT_MS}ms`);
            (timeoutError as any).retryable = true;
            (timeoutError as any).statusCode = 408;
            throw timeoutError;
        }
        throw error;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as MetaErrorResponse;
        const msg = err.error?.message ?? `HTTP ${response.status}`;
        const retryable = response.status === 429 || response.status >= 500;
        logCloudClientEvent({
            event: 'dependency_request_failed',
            status: response.status,
            reason: `http_${response.status}`,
            durationMs: Date.now() - startedAt,
            responsePreview: msg,
        });
        const error = new Error(`Meta WhatsApp API error: ${msg}`);
        (error as any).retryable = retryable;
        (error as any).statusCode = response.status;
        throw error;
    }

    return (await response.json()) as T;
}

async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = MAX_RETRIES,
): Promise<{ result: T; attempts: number } | { error: string; attempts: number }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            return { result, attempts: attempt };
        } catch (err) {
            const retryable = Boolean((err as any).retryable);
            if (!retryable || attempt >= maxRetries) {
                return {
                    error: err instanceof Error ? err.message : "Unknown error",
                    attempts: attempt,
                };
            }
            logCloudClientEvent({
                event: 'dependency_request_retry',
                status: Number((err as any).statusCode ?? 0),
                reason: err instanceof Error ? err.message : 'retryable_failure',
                attempt,
                maxRetries,
            });
            await delay(RETRY_BASE_MS * Math.pow(2, attempt - 1));
        }
    }
    return { error: "Retries exhausted", attempts: maxRetries };
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Send a plain text message to a WhatsApp number.
 * @param to - Recipient phone number in international format (e.g., "919876543210")
 * @param body - The text message body
 */
export async function sendTextMessage(to: string, body: string): Promise<WhatsAppSendResult> {
    if (!isConfigured()) {
        console.info(`[WhatsApp Mock] to=${to} body=${body.substring(0, 80)}...`);
        return { ok: true, attempts: 1, messageId: `mock-${Date.now()}` };
    }

    const outcome = await withRetry<MetaMessageResponse>(() =>
        metaRequest("/messages", {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { preview_url: false, body },
        }),
    );

    if ("error" in outcome) {
        return { ok: false, error: outcome.error, attempts: outcome.attempts };
    }

    const messageId = outcome.result.messages?.[0]?.id;
    return {
        ok: true,
        attempts: outcome.attempts,
        ...(messageId ? { messageId } : {}),
    };
}

/**
 * Send a pre-approved template message (e.g., nudge reminders).
 * @param to - Recipient phone number in international format
 * @param templateName - Template name as registered in Meta Business Manager
 * @param languageCode - e.g., "en_US"
 * @param parameters - Body parameter values (positional)
 */
export async function sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = "en_US",
    parameters: string[] = [],
): Promise<WhatsAppSendResult> {
    if (!isConfigured()) {
        console.info(
            `[WhatsApp Mock Template] to=${to} template=${templateName} params=${JSON.stringify(parameters)}`,
        );
        return { ok: true, attempts: 1, messageId: `mock-tmpl-${Date.now()}` };
    }

    const components =
        parameters.length > 0
            ? [
                  {
                      type: "body",
                      parameters: parameters.map((p) => ({ type: "text", text: p })),
                  },
              ]
            : undefined;

    const outcome = await withRetry<MetaMessageResponse>(() =>
        metaRequest("/messages", {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode },
                ...(components ? { components } : {}),
            },
        }),
    );

    if ("error" in outcome) {
        return { ok: false, error: outcome.error, attempts: outcome.attempts };
    }

    const messageId = outcome.result.messages?.[0]?.id;
    return {
        ok: true,
        attempts: outcome.attempts,
        ...(messageId ? { messageId } : {}),
    };
}

/**
 * Send a read receipt for a received message.
 * @param messageId - The wamid of the received message
 */
export async function markMessageRead(messageId: string): Promise<void> {
    if (!isConfigured()) {
        console.info(`[WhatsApp Mock] Marking ${messageId} as read`);
        return;
    }

    await metaRequest("/messages", {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
    });
}

/**
 * Check whether the Cloud API client is configured (has credentials).
 */
export { isConfigured as isWhatsAppCloudConfigured };
