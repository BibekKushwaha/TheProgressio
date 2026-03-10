import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/ai.service.js', () => ({
  aiService: {
    extractDocumentText: vi.fn().mockResolvedValue(''),
    previewTimetableImportFromImage: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@repo/db', () => ({
  prisma: {
    timetable: {
      findMany: vi.fn(),
    },
  },
}));

import router from '../src/routes/timetable.route.js';
import { prisma } from '@repo/db';

describe('POST /api/timetable/import/preview', () => {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use((req: any, _res, next) => {
    req.user = { id: 'user-1' };
    next();
  });
  app.use('/api/timetable', router);

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.timetable.findMany as any).mockResolvedValue([
      {
        id: 'existing-1',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        rotation: null,
        subjectId: 'sub-1',
        subject: { id: 'sub-1', name: 'Math', color: '#3B82F6' },
      },
    ]);
  });

  it('returns preview rows with duplicate warnings against existing timetable entries', async () => {
    const response = await request(app)
      .post('/api/timetable/import/preview')
      .send({
        sourceType: 'text',
        text: 'Mon 9-10 Math',
      });

    expect(response.status).toBe(200);
    expect(response.body.entries).toHaveLength(1);
    expect(response.body.entries[0]).toMatchObject({
      subjectName: 'Math',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(response.body.entries[0].warnings).toContain('Already exists in timetable');
    expect(response.body.parser).toMatchObject({
      deterministicMatches: 1,
      aiMatches: 0,
    });
  });

  it('validates the preview payload', async () => {
    const response = await request(app)
      .post('/api/timetable/import/preview')
      .send({
        sourceType: 'text',
        text: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('text is required');
  });
});
