import { incrementWhatsAppMetric } from './whatsapp-audit.service.js';

type MetaInteractiveButton = {
  id: string;
  title: string;
};

interface MetaCloudResponse {
  messages?: Array<{ id: string }>;
  error?: { message?: string };
}

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
const CLOUD_API_TIMEOUT_MS = Math.max(
  1_000,
  Number.parseInt(process.env.WHATSAPP_CLOUD_TIMEOUT_MS ?? '5000', 10) || 5000,
);
const CLOUD_API_MAX_RETRIES = Math.max(
  1,
  Number.parseInt(process.env.WHATSAPP_CLOUD_MAX_RETRIES ?? '3', 10) || 3,
);
const CLOUD_API_RETRY_BASE_MS = Math.max(
  100,
  Number.parseInt(process.env.WHATSAPP_CLOUD_RETRY_BASE_MS ?? '400', 10) || 400,
);

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const logWhatsAppDependencyEvent = (params: {
  event: 'dependency_request_failed' | 'dependency_request_retry';
  status: number;
  reason: string;
  durationMs?: number;
  timeoutMs: number;
  attempt?: number;
  maxRetries?: number;
  responsePreview?: string | null;
}): void => {
  console.warn(JSON.stringify({
    service: 'planner-service',
    subsystem: 'whatsapp',
    dependency: 'meta-whatsapp-cloud',
    operation: 'send_message',
    event: params.event,
    level: 'warn',
    method: 'POST',
    target: 'https://graph.facebook.com',
    status: params.status,
    reason: params.reason,
    ...(params.durationMs !== undefined ? { durationMs: params.durationMs } : {}),
    timeoutMs: params.timeoutMs,
    ...(params.attempt !== undefined ? { attempt: params.attempt } : {}),
    ...(params.maxRetries !== undefined ? { maxRetries: params.maxRetries } : {}),
    ...(params.responsePreview ? { responsePreview: params.responsePreview.slice(0, 160) } : {}),
    ts: new Date().toISOString(),
  }));
};

const readConfig = () => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  return {
    token,
    phoneNumberId,
    enabled: Boolean(token && phoneNumberId),
  };
};

const postCloudMessage = async (payload: Record<string, unknown>): Promise<MetaCloudResponse> => {
  const cfg = readConfig();

  if (!cfg.enabled || !cfg.token || !cfg.phoneNumberId) {
    console.warn('[WhatsApp] Cloud API not configured; skipping outbound message');
    return { messages: [] };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUD_API_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.token}`,
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
      signal: controller.signal,
    });

    const body = (await response.json().catch(() => ({}))) as MetaCloudResponse;

    if (!response.ok) {
      const message = body?.error?.message || `Cloud API failed with status ${response.status}`;
      incrementWhatsAppMetric('wa_outbound_failure');
      logWhatsAppDependencyEvent({
        event: 'dependency_request_failed',
        status: response.status,
        reason: `http_${response.status}`,
        durationMs: Date.now() - startedAt,
        timeoutMs: CLOUD_API_TIMEOUT_MS,
        responsePreview: message,
      });
      const error = new Error(message);
      (error as Error & { retryable?: boolean; statusCode?: number }).retryable =
        response.status === 408 || response.status === 429 || response.status >= 500;
      (error as Error & { retryable?: boolean; statusCode?: number }).statusCode = response.status;
      throw error;
    }

    incrementWhatsAppMetric('wa_outbound_success');
    return body;
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && 'name' in error
      && error.name === 'AbortError'
    ) {
      incrementWhatsAppMetric('wa_outbound_failure');
      logWhatsAppDependencyEvent({
        event: 'dependency_request_failed',
        status: 408,
        reason: 'timeout',
        durationMs: Date.now() - startedAt,
        timeoutMs: CLOUD_API_TIMEOUT_MS,
      });
      const timeoutError = new Error(`Cloud API timed out after ${CLOUD_API_TIMEOUT_MS}ms`);
      (timeoutError as Error & { retryable?: boolean; statusCode?: number }).retryable = true;
      (timeoutError as Error & { retryable?: boolean; statusCode?: number }).statusCode = 408;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const postCloudMessageWithRetry = async (payload: Record<string, unknown>): Promise<MetaCloudResponse> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CLOUD_API_MAX_RETRIES; attempt += 1) {
    try {
      return await postCloudMessage(payload);
    } catch (error) {
      lastError = error;
      const retryable = Boolean((error as { retryable?: boolean } | null)?.retryable);
      if (!retryable || attempt >= CLOUD_API_MAX_RETRIES) {
        throw error;
      }

      logWhatsAppDependencyEvent({
        event: 'dependency_request_retry',
        status: Number((error as { statusCode?: number } | null)?.statusCode ?? 0),
        reason: error instanceof Error ? error.message : 'retryable_failure',
        timeoutMs: CLOUD_API_TIMEOUT_MS,
        attempt,
        maxRetries: CLOUD_API_MAX_RETRIES,
      });

      await delay(CLOUD_API_RETRY_BASE_MS * Math.pow(2, attempt - 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Cloud API retries exhausted');
};

export const sendWhatsAppText = async (to: string, text: string): Promise<MetaCloudResponse> => {
  incrementWhatsAppMetric('wa_outbound_text');
  return postCloudMessageWithRetry({
    to,
    type: 'text',
    text: { body: text },
  });
};

export const sendWhatsAppTemplate = async (params: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyVariables?: string[];
}): Promise<MetaCloudResponse> => {
  incrementWhatsAppMetric('wa_outbound_template');
  const languageCode = params.languageCode || 'en';
  const variables = params.bodyVariables ?? [];

  return postCloudMessageWithRetry({
    to: params.to,
    type: 'template',
    template: {
      name: params.templateName,
      language: { code: languageCode },
      ...(variables.length > 0
        ? {
            components: [
              {
                type: 'body',
                parameters: variables.map((value) => ({ type: 'text', text: value })),
              },
            ],
          }
        : {}),
    },
  });
};

export const sendWhatsAppInteractiveButtons = async (params: {
  to: string;
  body: string;
  footer?: string;
  buttons: MetaInteractiveButton[];
}): Promise<MetaCloudResponse> => {
  incrementWhatsAppMetric('wa_outbound_interactive');
  return postCloudMessageWithRetry({
    to: params.to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: params.body },
      ...(params.footer ? { footer: { text: params.footer } } : {}),
      action: {
        buttons: params.buttons.slice(0, 3).map((button) => ({
          type: 'reply',
          reply: {
            id: button.id,
            title: button.title,
          },
        })),
      },
    },
  });
};
