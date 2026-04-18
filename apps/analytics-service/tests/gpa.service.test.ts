/**
 * Unit tests for gpa.service.ts
 *
 * Tests CGPA calculation, What-If simulator, and CourseGrade CRUD.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ────────────────────────────────────────────────────────────────

const { mockPrisma } = vi.hoisted(() => ({
    mockPrisma: {
        gradeEntry: {
            findMany: vi.fn(),
            create: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
        },
    },
}));

vi.mock('@repo/db', () => ({
    prisma: mockPrisma,
}));

import {
    GRADING_SCALES,
    calculateCGPA,
    whatIfGPA,
    addCourseGrade,
    updateCourseGrade,
    deleteCourseGrade,
} from '../src/services/gpa.service';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const makeCourse = (name: string, credits: number, gradePoint: number, semester: number = 1) => ({
    id: `ge-${name}`,
    userId: 'u1',
    subjectName: name,
    totalMarks: credits,
    obtainedMarks: gradePoint,
    chapter: 'A',
    examType: 'GPA_COURSE',
    timeTakenMins: semester,
    createdAt: new Date(),
});

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('GPA Service — GRADING_SCALES', () => {
    it('has INDIA_10 scale with correct grade points', () => {
        const india = GRADING_SCALES.INDIA_10;
        expect(india).toBeDefined();
        expect(india.maxGPA).toBe(10);
        expect(india.grades.length).toBeGreaterThan(0);

        const oGrade = india.grades.find((g: any) => g.grade === 'O');
        expect(oGrade).toBeDefined();
        expect(oGrade!.point).toBe(10);
    });

    it('has US_4 scale', () => {
        const us = GRADING_SCALES.US_4;
        expect(us).toBeDefined();
        expect(us.maxGPA).toBe(4);
    });
});

describe('GPA Service — calculateCGPA', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns 0 CGPA when no courses exist', async () => {
        mockPrisma.gradeEntry.findMany.mockResolvedValue([]);

        const result = await calculateCGPA('u1', 'INDIA_10');

        expect(result).toHaveProperty('currentCGPA', 0);
        expect(result).toHaveProperty('totalCredits', 0);
    });

    it('calculates weighted CGPA correctly', async () => {
        const courses = [
            makeCourse('Physics', 4, 9, 1),    // 4 × 9 = 36
            makeCourse('Chemistry', 3, 8, 1),   // 3 × 8 = 24
            makeCourse('Maths', 4, 10, 1),      // 4 × 10 = 40
        ];
        // Total = 100, Credits = 11, CGPA = 100/11 ≈ 9.09
        mockPrisma.gradeEntry.findMany.mockResolvedValue(courses);

        const result = await calculateCGPA('u1', 'INDIA_10');

        expect(result.currentCGPA).toBeCloseTo(9.09, 1);
        expect(result.totalCredits).toBe(11);
    });

    it('provides semester breakdown', async () => {
        const courses = [
            makeCourse('Physics', 4, 9, 1),
            makeCourse('Chemistry', 3, 8, 1),
            makeCourse('DataStructures', 4, 7, 2),
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(courses);

        const result = await calculateCGPA('u1', 'INDIA_10');

        expect(result).toHaveProperty('semesters');
        expect(result.semesters.length).toBeGreaterThanOrEqual(1);
    });
});

describe('GPA Service — whatIfGPA', () => {
    beforeEach(() => vi.clearAllMocks());

    it('calculates required GPA for target CGPA', async () => {
        const courses = [
            makeCourse('Physics', 4, 8, 1),
            makeCourse('Chemistry', 3, 7, 1),
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(courses);

        const result = await whatIfGPA('u1', 9.0, 10, 'INDIA_10');

        expect(result).toHaveProperty('currentCGPA');
        expect(result).toHaveProperty('targetCGPA', 9.0);
        expect(result).toHaveProperty('requiredGPA');
        expect(result).toHaveProperty('achievable');
        expect(result).toHaveProperty('strategy');
        expect(typeof result.requiredGPA).toBe('number');
    });

    it('marks unachievable targets correctly', async () => {
        const courses = [
            makeCourse('Physics', 40, 5, 1),  // heavy credits at low grade
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(courses);

        // Target 10.0 with only 2 remaining credits is impossible
        const result = await whatIfGPA('u1', 10.0, 2, 'INDIA_10');

        expect(result.achievable).toBe(false);
    });

    it('returns achievable = true for reasonable targets', async () => {
        const courses = [
            makeCourse('Physics', 4, 9, 1),
        ];
        mockPrisma.gradeEntry.findMany.mockResolvedValue(courses);

        // Target slightly above current should be achievable
        const result = await whatIfGPA('u1', 9.5, 20, 'INDIA_10');

        expect(result.achievable).toBe(true);
    });
});

describe('GPA Service — CourseGrade CRUD', () => {
    beforeEach(() => vi.clearAllMocks());

    it('addCourseGrade creates a new entry', async () => {
        const newCourse = makeCourse('Biology', 3, 8, 1);
        mockPrisma.gradeEntry.create.mockResolvedValue(newCourse);

        const result = await addCourseGrade('u1', {
            courseName: 'Biology', credits: 3, gradePoint: 8, semester: 1,
        });

        expect(result).toHaveProperty('courseName', 'Biology');
        expect(mockPrisma.gradeEntry.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'u1',
                    subjectName: 'Biology',
                    examType: 'GPA_COURSE',
                }),
            })
        );
    });

    it('updateCourseGrade updates an existing entry', async () => {
        mockPrisma.gradeEntry.updateMany.mockResolvedValue({ count: 1 });

        await updateCourseGrade('cg-1', 'u1', { gradePoint: 9 });

        expect(mockPrisma.gradeEntry.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'cg-1', userId: 'u1', examType: 'GPA_COURSE' },
            })
        );
    });

    it('deleteCourseGrade removes an entry', async () => {
        mockPrisma.gradeEntry.deleteMany.mockResolvedValue({ count: 1 });

        await deleteCourseGrade('cg-1', 'u1');

        expect(mockPrisma.gradeEntry.deleteMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'cg-1', userId: 'u1', examType: 'GPA_COURSE' } })
        );
    });
});
