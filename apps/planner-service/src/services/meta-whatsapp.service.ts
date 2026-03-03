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

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.token}`,
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });

  const body = (await response.json().catch(() => ({}))) as MetaCloudResponse;

  if (!response.ok) {
    const message = body?.error?.message || `Cloud API failed with status ${response.status}`;
    incrementWhatsAppMetric('wa_outbound_failure');
    throw new Error(message);
  }

  incrementWhatsAppMetric('wa_outbound_success');
  return body;
};

export const sendWhatsAppText = async (to: string, text: string): Promise<MetaCloudResponse> => {
  incrementWhatsAppMetric('wa_outbound_text');
  return postCloudMessage({
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

  return postCloudMessage({
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
  return postCloudMessage({
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
