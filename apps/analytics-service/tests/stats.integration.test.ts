/**
 * Integration tests for Analytics Service API endpoints (Phase 3)
 *
 * Tests all new HTTP endpoints: Prediction, SWOT, GPA, Focus/Leakage.
 */
import request from 'supertest';
import { describe, it, beforeEach, expect, vi } from 'vitest';

// ─── Mock auth middleware ───────────────────────────────────────────────────────

vi.mock('../src/middleware/auth.middleware.js', () => ({
    isAuth: (req: any, _res: any, next: any) => {
        req.user = { id: 'user-1', username: 'Tester', email: 'test@example.com', dailyGoalHours: 4 };
        next();
    },
}));

// ─── Mock services ──────────────────────────────────────────────────────────────

vi.mock('../src/services/prediction.service.js', () => ({
    predictTaskDuration: vi.fn().mockResolvedValue({
        optimistic: 20, probable: 35, pessimistic: 60,
        expected: 36, standardDeviation: 7, confidence: 'medium', sampleSize: 8,
    }),
    getCycleTimePercentiles: vi.fn().mockResolvedValue({
        p50: 30, p85: 50, p95: 70,
        scatterData: [{ completedAt: '2026-02-01', durationMinutes: 35 }],
    }),
}));

vi.mock('../src/services/swot.service.js', () => ({
    generateSWOT: vi.fn().mockResolvedValue({
        examType: 'JEE',
        subjects: [{
            subject: 'Physics',
            strengths: [{ chapter: 'Mechanics', score: 92 }],
            weaknesses: [{ chapter: 'Optics', score: 45 }],
            opportunities: [],
            threats: [{ chapter: 'Nuclear', score: 25, reason: 'critical' }],
        }],
        overallReadiness: 65,
        topPriorityChapters: ['Nuclear', 'Optics'],
    }),
    getSubjectPerformance: vi.fn().mockResolvedValue({
        pace: 'accelerating',
        recentScoreAvg: 78,
        historicalScoreAvg: 65,
        trend: [{ date: '2026-01-01', score: 65 }, { date: '2026-02-01', score: 78 }],
    }),
}));

vi.mock('../src/services/gpa.service.js', () => ({
    calculateCGPA: vi.fn().mockResolvedValue({
        cgpa: 8.5, totalCredits: 24,
        semesterBreakdown: [{ semester: 1, gpa: 8.5, credits: 24 }],
        courses: [],
    }),
    whatIfGPA: vi.fn().mockResolvedValue({
        currentCGPA: 8.5, targetCGPA: 9.0, requiredGPA: 9.8, achievable: true,
        strategy: 'Focus on high-credit courses',
    }),
    addCourseGrade: vi.fn().mockResolvedValue({
        id: 'cg-1', courseName: 'Physics', credits: 4, gradePoint: 9,
    }),
    updateCourseGrade: vi.fn().mockResolvedValue({
        id: 'cg-1', courseName: 'Physics', credits: 4, gradePoint: 10,
    }),
    deleteCourseGrade: vi.fn().mockResolvedValue({ id: 'cg-1' }),
}));

vi.mock('../src/services/focus.service.js', () => ({
    getPlannedVsActual: vi.fn().mockResolvedValue({
        periodDays: 14, totalPlannedMinutes: 3360, totalActualMinutes: 2100,
        totalLeakageMinutes: 1260, leakagePercentage: 38,
        dailyBreakdown: [], worstDays: [],
        suggestion: 'Moderate leakage detected.',
    }),
    detectPeakProductivity: vi.fn().mockResolvedValue({
        peakWindow: { startHour: 9, endHour: 11, label: '9 AM – 11 AM' },
        efficiencyByHour: Array.from({ length: 24 }, (_, h) => ({
            hour: h, avgMinutes: h === 9 ? 55 : 20, sessionCount: h === 9 ? 10 : 2, avgFocusRatio: 50,
        })),
        recommendation: 'Peak at 9-11 AM', efficiencyBoostPercent: 45,
    }),
    getPredictivePerformance: vi.fn().mockResolvedValue([
        { subjectName: 'Physics', pace: 'accelerating', estimatedExamScore: 85, estimatedPercentile: 85 },
    ]),
}));

// ─── Mock Prisma ────────────────────────────────────────────────────────────────

vi.mock('@repo/db', () => ({
    prisma: {
        activityLog: { aggregate: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
        taskCompletionStat: { count: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
        task: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
        achievement: { findMany: vi.fn() },
        userAchievement: { findMany: vi.fn(), createMany: vi.fn() },
        gradeEntry: {
            create: vi.fn().mockResolvedValue({
                id: 'ge1', subjectName: 'Physics', chapter: 'Mechanics',
                totalMarks: 100, obtainedMarks: 85, examType: 'JEE',
            }),
            findMany: vi.fn().mockResolvedValue([]),
            delete: vi.fn().mockResolvedValue({ id: 'ge1' }),
        },
    },
}));

import { app } from '../src/index.js';

// ─── Prediction Endpoints ───────────────────────────────────────────────────────

describe('Analytics API — Duration Prediction', () => {
    beforeEach(() => vi.clearAllMocks());

    it('GET /api/stats/predict — returns PERT prediction', async () => {
        const res = await request(app).get('/api/stats/predict');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('prediction');
        expect(res.body.prediction).toHaveProperty('optimistic', 20);
        expect(res.body.prediction).toHaveProperty('probable', 35);
        expect(res.body.prediction).toHaveProperty('pessimistic', 60);
        expect(res.body.prediction).toHaveProperty('expected', 36);
        expect(res.body.prediction).toHaveProperty('sampleSize', 8);
    });

    it('GET /api/stats/predict?categoryId=c1 — filters by category', async () => {
        const res = await request(app).get('/api/stats/predict?categoryId=c1');
        expect(res.status).toBe(200);
    });

    it('GET /api/stats/cycle-time — returns percentiles', async () => {
        const res = await request(app).get('/api/stats/cycle-time');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('p50');
        expect(res.body.data).toHaveProperty('p85');
        expect(res.body.data).toHaveProperty('p95');
        expect(res.body.data).toHaveProperty('scatterData');
    });
});

// ─── SWOT Endpoints ─────────────────────────────────────────────────────────────

describe('Analytics API — SWOT Analysis', () => {
    beforeEach(() => vi.clearAllMocks());

    it('GET /api/stats/swot/JEE — returns SWOT analysis', async () => {
        const res = await request(app).get('/api/stats/swot/JEE');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('swot');
        expect(res.body.swot).toHaveProperty('examType', 'JEE');
        expect(res.body.swot).toHaveProperty('subjects');
        expect(res.body.swot).toHaveProperty('overallReadiness');
        expect(res.body.swot).toHaveProperty('topPriorityChapters');
    });

    it('GET /api/stats/subject/Physics — returns subject performance', async () => {
        const res = await request(app).get('/api/stats/subject/Physics');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('pace', 'accelerating');
    });
});

// ─── GPA Endpoints ──────────────────────────────────────────────────────────────

describe('Analytics API — GPA Calculator', () => {
    beforeEach(() => vi.clearAllMocks());

    it('GET /api/stats/gpa — returns CGPA result', async () => {
        const res = await request(app).get('/api/stats/gpa');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('result');
        expect(res.body.result).toHaveProperty('cgpa', 8.5);
        expect(res.body.result).toHaveProperty('totalCredits', 24);
    });

    it('GET /api/stats/gpa?scale=US_4 — allows scale parameter', async () => {
        const res = await request(app).get('/api/stats/gpa?scale=US_4');
        expect(res.status).toBe(200);
    });

    it('POST /api/stats/gpa/what-if — returns what-if result', async () => {
        const res = await request(app)
            .post('/api/stats/gpa/what-if')
            .send({ targetCGPA: 9.0, remainingCredits: 20 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('result');
        expect(res.body.result).toHaveProperty('requiredGPA');
        expect(res.body.result).toHaveProperty('achievable', true);
        expect(res.body.result).toHaveProperty('strategy');
    });

    it('POST /api/stats/gpa/what-if — 400 on missing fields', async () => {
        const res = await request(app)
            .post('/api/stats/gpa/what-if')
            .send({});

        expect(res.status).toBe(400);
    });

    it('POST /api/stats/gpa/course — creates a course', async () => {
        const res = await request(app)
            .post('/api/stats/gpa/course')
            .send({ courseName: 'Physics', credits: 4, gradePoint: 9 });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('course');
    });

    it('POST /api/stats/gpa/course — 400 when fields missing', async () => {
        const res = await request(app)
            .post('/api/stats/gpa/course')
            .send({});

        expect(res.status).toBe(400);
    });

    it('PUT /api/stats/gpa/course/:id — updates a course', async () => {
        const res = await request(app)
            .put('/api/stats/gpa/course/cg-1')
            .send({ gradePoint: 10 });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('course');
    });

    it('DELETE /api/stats/gpa/course/:id — deletes a course', async () => {
        const res = await request(app).delete('/api/stats/gpa/course/cg-1');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Course deleted');
    });
});

// ─── Grade Entry Endpoints ──────────────────────────────────────────────────────

describe('Analytics API — Grade Entries', () => {
    beforeEach(() => vi.clearAllMocks());

    it('POST /api/stats/grade-entry — creates a grade entry', async () => {
        const res = await request(app)
            .post('/api/stats/grade-entry')
            .send({ subjectName: 'Physics', chapter: 'Mechanics', totalMarks: 100, obtainedMarks: 85 });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('entry');
    });

    it('POST /api/stats/grade-entry — 400 on missing fields', async () => {
        const res = await request(app)
            .post('/api/stats/grade-entry')
            .send({});

        expect(res.status).toBe(400);
    });

    it('GET /api/stats/grade-entries — returns entries list', async () => {
        const res = await request(app).get('/api/stats/grade-entries');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('entries');
        expect(Array.isArray(res.body.entries)).toBe(true);
    });

    it('DELETE /api/stats/grade-entry/:id — deletes an entry', async () => {
        const res = await request(app).delete('/api/stats/grade-entry/ge1');

        expect(res.status).toBe(200);
    });
});

// ─── Focus & Time Leakage Endpoints ─────────────────────────────────────────────

describe('Analytics API — Focus & Time Leakage', () => {
    beforeEach(() => vi.clearAllMocks());

    it('GET /api/stats/focus/leakage — returns time leakage report', async () => {
        const res = await request(app).get('/api/stats/focus/leakage');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('report');
        expect(res.body.report).toHaveProperty('periodDays');
        expect(res.body.report).toHaveProperty('totalPlannedMinutes');
        expect(res.body.report).toHaveProperty('totalActualMinutes');
        expect(res.body.report).toHaveProperty('leakagePercentage');
        expect(res.body.report).toHaveProperty('suggestion');
    });

    it('GET /api/stats/focus/leakage?days=7 — accepts days parameter', async () => {
        const res = await request(app).get('/api/stats/focus/leakage?days=7');
        expect(res.status).toBe(200);
    });

    it('GET /api/stats/focus/peak-window — returns peak productivity', async () => {
        const res = await request(app).get('/api/stats/focus/peak-window');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('peakWindow');
        expect(res.body.data.peakWindow).toHaveProperty('label', '9 AM – 11 AM');
        expect(res.body.data).toHaveProperty('efficiencyByHour');
        expect(res.body.data).toHaveProperty('recommendation');
    });

    it('GET /api/stats/performance/JEE — returns predictive performance', async () => {
        const res = await request(app).get('/api/stats/performance/JEE');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data[0]).toHaveProperty('subjectName', 'Physics');
        expect(res.body.data[0]).toHaveProperty('pace', 'accelerating');
    });
});

// ─── Existing Endpoints Still Work ──────────────────────────────────────────────

describe('Analytics API — Existing Endpoints', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const { prisma } = await import('@repo/db') as any;
        prisma.activityLog.aggregate.mockResolvedValue({ _sum: { durationMinutes: 120 } });
        prisma.activityLog.groupBy.mockResolvedValue([]);
        prisma.taskCompletionStat.count.mockResolvedValue(3);
    });

    it('GET /api/stats/daily — still returns daily summary', async () => {
        const res = await request(app).get('/api/stats/daily');
        expect(res.status).toBe(200);
    });

    it('GET / — health check returns 200', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
    });
});
