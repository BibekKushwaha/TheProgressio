/**
 * Unit tests for swot.service.ts
 *
 * Tests chapter-wise SWOT generation and subject performance tracking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────────────────────────────────

const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
        gradeEntry: { findMany: vi.fn() },
    },
}));

vi.mock('@repo/db', () => ({
    prisma: mockPrisma,
}));

import { generateSWOT, getSubjectPerformance } from '../src/services/swot.service';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const makeEntry = (subject: string, chapter: string, obtained: number, total: number = 100, daysAgo: number = 0) => ({
    id: `ge-${subject}-${chapter}`,
    userId: 'u1',
    subjectName: subject,
    chapter,
    totalMarks: total,
    obtainedMarks: obtained,
    examType: 'JEE',
    timeTakenMins: 60,
    createdAt: new Date(Date.now() - daysAgo * 86400_000),
});

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('SWOT Service — generateSWOT', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns empty SWOT when no grade entries exist', async () => {
        mockPrisma.gradeEntry.findMany.mockResolvedValue([]);

        const result = await generateSWOT('u1', 'JEE');

        expect(result).toHaveProperty('examType', 'JEE');
        expect(result).toHaveProperty('subjects');
        expect(result.subjects).toHaveLength(0);
    });

    it('classifies chapters by score thresholds', async () => {
        const entries = [
            makeEntry('Physics', 'Mechanics', 95),      // strength (≥80%)
            makeEntry('Physics', 'Optics', 70),          // average (≥60%)
            makeEntry('Physics', 'Thermodynamics', 45),  // weakness (≥40%)
            makeEntry('Physics', 'Nuclear', 25),          // critical (<40%)
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(entries);

        const result = await generateSWOT('u1', 'JEE');

        expect(result.subjects.length).toBeGreaterThanOrEqual(1);
        const physics = result.subjects.find(s => s.subject === 'Physics');
        expect(physics).toBeDefined();

        // Verify strength chapters (≥80%)
        const strengthChapters = physics!.strengths.map(s => s.chapter);
        expect(strengthChapters).toContain('Mechanics');

        // Verify weaker chapters appear in weaknesses or threats
        const weakChapters = [...physics!.weaknesses, ...physics!.threats].map(w => w.chapter);
        expect(weakChapters).toContain('Nuclear');
    });

    it('handles multiple subjects', async () => {
        const entries = [
            makeEntry('Physics', 'Mechanics', 85),
            makeEntry('Chemistry', 'Organic', 90),
            makeEntry('Maths', 'Calculus', 70),
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(entries);

        const result = await generateSWOT('u1', 'JEE');

        expect(result.subjects.length).toBe(3);
        const subjectNames = result.subjects.map(s => s.subject);
        expect(subjectNames).toContain('Physics');
        expect(subjectNames).toContain('Chemistry');
        expect(subjectNames).toContain('Maths');
    });

    it('calculates overallReadiness and topPriorityChapters', async () => {
        const entries = [
            makeEntry('Physics', 'Mechanics', 90),
            makeEntry('Physics', 'Optics', 30),
            makeEntry('Chemistry', 'Organic', 80),
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(entries);

        const result = await generateSWOT('u1', 'JEE');

        expect(result).toHaveProperty('overallReadiness');
        expect(typeof result.overallReadiness).toBe('number');
        expect(result.overallReadiness).toBeGreaterThanOrEqual(0);
        expect(result.overallReadiness).toBeLessThanOrEqual(100);

        expect(result).toHaveProperty('topPriorityChapters');
        expect(Array.isArray(result.topPriorityChapters)).toBe(true);
    });
});

describe('SWOT Service — getSubjectPerformance', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns null for unknown subject', async () => {
        mockPrisma.gradeEntry.findMany.mockResolvedValue([]);

        const result = await getSubjectPerformance('u1', 'Unknown');

        expect(result).toBeNull();
    });

    it('detects accelerating pace when recent scores improve', async () => {
        // Need ≥10 entries so first5 and last5 don't overlap
        const entries = [
            makeEntry('Physics', 'Ch1', 40, 100, 50),
            makeEntry('Physics', 'Ch2', 42, 100, 45),
            makeEntry('Physics', 'Ch3', 44, 100, 40),
            makeEntry('Physics', 'Ch4', 46, 100, 35),
            makeEntry('Physics', 'Ch5', 48, 100, 30),
            makeEntry('Physics', 'Ch6', 70, 100, 20),
            makeEntry('Physics', 'Ch7', 75, 100, 15),
            makeEntry('Physics', 'Ch8', 80, 100, 10),
            makeEntry('Physics', 'Ch9', 85, 100, 5),
            makeEntry('Physics', 'Ch10', 90, 100, 1),
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(entries);

        const result = await getSubjectPerformance('u1', 'Physics');

        expect(result!.learningPace).toBe('accelerating');
    });

    it('detects declining pace when recent scores drop', async () => {
        const entries = [
            makeEntry('Chemistry', 'Ch1', 90, 100, 50),
            makeEntry('Chemistry', 'Ch2', 88, 100, 45),
            makeEntry('Chemistry', 'Ch3', 85, 100, 40),
            makeEntry('Chemistry', 'Ch4', 83, 100, 35),
            makeEntry('Chemistry', 'Ch5', 80, 100, 30),
            makeEntry('Chemistry', 'Ch6', 55, 100, 20),
            makeEntry('Chemistry', 'Ch7', 50, 100, 15),
            makeEntry('Chemistry', 'Ch8', 45, 100, 10),
            makeEntry('Chemistry', 'Ch9', 40, 100, 5),
            makeEntry('Chemistry', 'Ch10', 35, 100, 1),
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(entries);

        const result = await getSubjectPerformance('u1', 'Chemistry');

        expect(result!.learningPace).toBe('declining');
    });
});
