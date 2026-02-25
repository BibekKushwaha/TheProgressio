import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

const { mockCreateTaskFromText } = vi.hoisted(() => ({
  mockCreateTaskFromText: vi.fn(),
}));

const { mockSanitizeIncomingText, mockExtractWhatsAppIntentAndTask } = vi.hoisted(() => ({
  mockSanitizeIncomingText: vi.fn((text: string) => text),
  mockExtractWhatsAppIntentAndTask: vi.fn().mockResolvedValue({
    intent: 'create_task',
    title: 'Generated Task',
    dueAt: null,
    recurrence: null,
    confidence: 0.95,
    source: 'rule',
  }),
}));

vi.mock('../src/controllers/task.controller.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/controllers/task.controller.js')>();
  return {
    ...actual,
    createTaskFromText: mockCreateTaskFromText,
  };
});

vi.mock('../src/services/ai.service.js', () => ({
  aiService: {
    sanitizeIncomingText: mockSanitizeIncomingText,
    extractWhatsAppIntentAndTask: mockExtractWhatsAppIntentAndTask,
    generateSubtasks: vi.fn().mockResolvedValue(['Step 1', 'Step 2']),
  },
}));

vi.mock('../src/services/producer.service.js', () => ({
  producer: { connect: vi.fn(), send: vi.fn(), disconnect: vi.fn() },
  emitTaskEvent: vi.fn(),
  TaskEventType: {
    TASK_CREATED: 'task.created',
    TASK_UPDATED: 'task.updated',
    TASK_COMPLETED: 'task.completed',
    TASK_DELETED: 'task.deleted',
    TASK_STATUS_CHANGED: 'task.status_changed',
  },
}));

vi.mock('@repo/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
  Status: { PENDING: 'PENDING', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED' },
  Priority: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
  AttendanceStatus: { PRESENT: 'PRESENT', ABSENT: 'ABSENT', LATE: 'LATE' },
  AttendanceMethod: { QR: 'QR', MANUAL: 'MANUAL', GEOFENCE: 'GEOFENCE' },
}));

import { app } from '../src/index.js';
import { extractWhatsAppInbound, isWhatsAppMetaSignatureValid, resolveWhatsAppOcr, resolveWhatsAppTranscript } from '../src/services/whatsapp.service.js';

describe('whatsapp.service — extractWhatsAppInbound', () => {
  it('extracts direct text payload', () => {
    const inbound = extractWhatsAppInbound({
      userId: 'u1',
      from: '+91 98765 43210',
      text: 'Biology test next Friday p1',
    });

    expect(inbound.text).toBe('Biology test next Friday p1');
    expect(inbound.sender).toBe('+91 98765 43210');
    expect(inbound.explicitUserId).toBe('u1');
    expect(inbound.audioUrl).toBeNull();
  });

  it('extracts audio metadata and transcript from webhook payload', () => {
    const inbound = extractWhatsAppInbound({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '919876543210',
                    type: 'audio',
                    audio: { id: 'aud-1', url: 'https://example.com/audio.ogg' },
                  },
                ],
                transcriptions: [
                  { text: 'Complete math worksheet by 8pm', language: 'en', confidence: 0.91 },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(inbound.text).toBeNull();
    expect(inbound.audioMessageId).toBe('aud-1');
    expect(inbound.audioUrl).toBe('https://example.com/audio.ogg');
    expect(inbound.transcript).toBe('Complete math worksheet by 8pm');
    expect(inbound.language).toBe('en');
    expect(inbound.confidence).toBe(0.91);
  });

  it('extracts interactive button reply metadata from webhook payload', () => {
    const inbound = extractWhatsAppInbound({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '919876543210',
                    type: 'interactive',
                    interactive: {
                      type: 'button_reply',
                      button_reply: { id: 'task_complete:t1', title: 'Mark as Completed' },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(inbound.interactiveReplyId).toBe('task_complete:t1');
    expect(inbound.interactiveReplyTitle).toBe('Mark as Completed');
  });
});

describe('whatsapp.service — resolveWhatsAppTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_TRANSCRIBE_URL;
  });

  it('uses payload transcript without calling transcription service', async () => {
    const result = await resolveWhatsAppTranscript({
      text: null,
      sender: '9198',
      explicitUserId: null,
      audioUrl: 'https://example.com/audio.ogg',
      audioMessageId: 'aud-1',
      imageUrl: null,
      imageMessageId: null,
      imageCaption: null,
      transcript: 'payload transcript',
      language: 'en',
      confidence: 0.88,
      interactiveReplyId: null,
      interactiveReplyTitle: null,
    });

    expect(result).toEqual({
      transcript: 'payload transcript',
      language: 'en',
      confidence: 0.88,
      source: 'payload',
    });
  });

  it('falls back to remote transcription service when audio URL exists', async () => {
    process.env.WHATSAPP_TRANSCRIBE_URL = 'https://transcribe.example.com';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transcript: 'mock transcript', language: 'en', confidence: 0.93 }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveWhatsAppTranscript({
      text: null,
      sender: '9198',
      explicitUserId: null,
      audioUrl: 'https://example.com/audio.ogg',
      audioMessageId: 'aud-2',
      imageUrl: null,
      imageMessageId: null,
      imageCaption: null,
      transcript: null,
      language: null,
      confidence: null,
      interactiveReplyId: null,
      interactiveReplyTitle: null,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      transcript: 'mock transcript',
      language: 'en',
      confidence: 0.93,
      source: 'service',
    });

    vi.unstubAllGlobals();
  });
});

describe('whatsapp.service — resolveWhatsAppOcr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_OCR_URL;
  });

  it('uses image caption when available', async () => {
    const result = await resolveWhatsAppOcr({
      text: null,
      sender: '9198',
      explicitUserId: null,
      audioUrl: null,
      audioMessageId: null,
      imageUrl: 'https://example.com/img.jpg',
      imageMessageId: 'img-1',
      imageCaption: 'Math homework due tomorrow',
      transcript: null,
      language: 'en',
      confidence: 0.8,
      interactiveReplyId: null,
      interactiveReplyTitle: null,
    });

    expect(result).toEqual({
      text: 'Math homework due tomorrow',
      language: 'en',
      confidence: 0.8,
      source: 'caption',
    });
  });
});

describe('whatsapp.controller — capture endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_NUMBER_USER_MAP = JSON.stringify({
      '919876543210': 'user-1',
    });
    process.env.WHATSAPP_WEBHOOK_SECRET = 'wa-secret';
    delete process.env.WHATSAPP_TRANSCRIBE_URL;

    mockCreateTaskFromText.mockResolvedValue({
      task: { id: 't1', title: 'Generated Task' },
      parsedData: { title: 'Generated Task' },
    });

    mockSanitizeIncomingText.mockImplementation((text: string) => text);
    mockExtractWhatsAppIntentAndTask.mockResolvedValue({
      intent: 'create_task',
      title: 'Generated Task',
      dueAt: null,
      recurrence: null,
      confidence: 0.95,
      source: 'rule',
    });
  });

  it('creates task from direct text payload', async () => {
    const res = await request(app)
      .post('/api/integrations/whatsapp/capture')
      .set('x-whatsapp-secret', 'wa-secret')
      .send({ userId: 'user-1', text: 'Finish chemistry assignment at 9pm', from: '919876543210' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Task captured from WhatsApp');
    expect(mockCreateTaskFromText).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        text: 'Finish chemistry assignment at 9pm',
        source: 'whatsapp-capture',
      })
    );
  });

  it('creates task from voice transcript payload', async () => {
    const res = await request(app)
      .post('/api/integrations/whatsapp/capture')
      .set('x-whatsapp-secret', 'wa-secret')
      .send({
        userId: 'user-1',
        from: '919876543210',
        transcript: 'Solve 30 MCQs before dinner',
        audioUrl: 'https://example.com/audio.ogg',
        language: 'en',
        confidence: 0.87,
      });

    expect(res.status).toBe(201);
    expect(mockCreateTaskFromText).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'whatsapp-capture-voice',
        text: 'Solve 30 MCQs before dinner',
        metadata: expect.objectContaining({
          audioUrl: 'https://example.com/audio.ogg',
          transcriptionSource: 'payload',
        }),
      })
    );
  });

  it('returns 400 when no text or transcript can be resolved', async () => {
    const res = await request(app)
      .post('/api/integrations/whatsapp/capture')
      .set('x-whatsapp-secret', 'wa-secret')
      .send({ userId: 'user-1', from: '919876543210' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('No parseable text message found');
  });

  it('asks clarification when extraction confidence is low', async () => {
    mockExtractWhatsAppIntentAndTask.mockResolvedValueOnce({
      intent: 'create_task',
      title: 'Generated Task',
      dueAt: null,
      recurrence: null,
      confidence: 0.55,
      source: 'ai',
    });

    const res = await request(app)
      .post('/api/integrations/whatsapp/capture')
      .set('x-whatsapp-secret', 'wa-secret')
      .send({ userId: 'user-1', text: 'Call mom tomorrow', from: '919876543210' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Clarification required');
    expect(mockCreateTaskFromText).not.toHaveBeenCalled();
  });

  it('does not create task for non-create intents', async () => {
    mockExtractWhatsAppIntentAndTask.mockResolvedValueOnce({
      intent: 'list_tasks',
      title: '',
      dueAt: null,
      recurrence: null,
      confidence: 0.9,
      source: 'rule',
    });

    const res = await request(app)
      .post('/api/integrations/whatsapp/capture')
      .set('x-whatsapp-secret', 'wa-secret')
      .send({ userId: 'user-1', text: 'show my tasks', from: '919876543210' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Non-create intent handled');
    expect(res.body.intent).toBe('list_tasks');
    expect(mockCreateTaskFromText).not.toHaveBeenCalled();
  });
});

describe('whatsapp.service — isWhatsAppMetaSignatureValid', () => {
  const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WHATSAPP_APP_SECRET;
  });

  it('returns false when WHATSAPP_APP_SECRET is missing', () => {
    const signature = crypto.createHmac('sha256', 'secret').update(rawBody).digest('hex');
    expect(isWhatsAppMetaSignatureValid({ signatureHeader: `sha256=${signature}`, rawBody })).toBe(false);
  });

  it('returns true for a valid signature', () => {
    process.env.WHATSAPP_APP_SECRET = 'secret';
    const signature = crypto.createHmac('sha256', 'secret').update(rawBody).digest('hex');
    expect(isWhatsAppMetaSignatureValid({ signatureHeader: `sha256=${signature}`, rawBody })).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    process.env.WHATSAPP_APP_SECRET = 'secret';
    expect(isWhatsAppMetaSignatureValid({ signatureHeader: 'sha256=deadbeef', rawBody })).toBe(false);
  });
});

describe('whatsapp.controller — webhook endpoint (signature)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_APP_SECRET = 'app-secret';
  });

  it('rejects the request when signature header is missing', async () => {
    const payload = { entry: [] };
    const raw = JSON.stringify(payload);

    const res = await request(app)
      .post('/api/integrations/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .send(raw);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Unauthorized');
  });

  it('rejects the request when signature is invalid', async () => {
    const payload = { entry: [] };
    const raw = JSON.stringify(payload);

    const res = await request(app)
      .post('/api/integrations/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', 'sha256=deadbeef')
      .send(raw);

    expect(res.status).toBe(401);
  });

  it('acknowledges non-message events when signature is valid', async () => {
    const payload = { entry: [] };
    const raw = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', 'app-secret').update(Buffer.from(raw)).digest('hex');

    const res = await request(app)
      .post('/api/integrations/whatsapp/webhook')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', `sha256=${signature}`)
      .send(raw);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Ignored');
  });
});
