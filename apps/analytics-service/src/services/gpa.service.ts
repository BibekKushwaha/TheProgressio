/**
 * GPA "What-If" Calculator — supports Indian 10-point grading scales.
 *
 * Manages:
 * 1. Current CGPA tracking with multiple semesters
 * 2. "What-If" simulation: what grades do I need to hit target CGPA?
 * 3. Custom weighted grading scales (10-point, 4-point, percentage)
 */
import { prisma } from "@repo/db";

// ── Grading Scales ─────────────────────────────────────────────────────

export const GRADING_SCALES = {
    INDIA_10: {
        name: "Indian 10-Point (CGPA)",
        maxGPA: 10,
        grades: [
            { grade: "O", min: 90, point: 10 },
            { grade: "A+", min: 80, point: 9 },
            { grade: "A", min: 70, point: 8 },
            { grade: "B+", min: 60, point: 7 },
            { grade: "B", min: 50, point: 6 },
            { grade: "C", min: 40, point: 5 },
            { grade: "P", min: 35, point: 4 },
            { grade: "F", min: 0, point: 0 },
        ],
    },
    US_4: {
        name: "US 4-Point (GPA)",
        maxGPA: 4,
        grades: [
            { grade: "A+", min: 97, point: 4.0 },
            { grade: "A", min: 93, point: 4.0 },
            { grade: "A-", min: 90, point: 3.7 },
            { grade: "B+", min: 87, point: 3.3 },
            { grade: "B", min: 83, point: 3.0 },
            { grade: "B-", min: 80, point: 2.7 },
            { grade: "C+", min: 77, point: 2.3 },
            { grade: "C", min: 73, point: 2.0 },
            { grade: "C-", min: 70, point: 1.7 },
            { grade: "D", min: 60, point: 1.0 },
            { grade: "F", min: 0, point: 0 },
        ],
    },
    PERCENTAGE: {
        name: "Percentage",
        maxGPA: 100,
        grades: [], // direct percentage, no letter grades
    },
} as const;

export type GradingScaleKey = keyof typeof GRADING_SCALES;

// ── Types ──────────────────────────────────────────────────────────────

export interface SemesterGPA {
    semester: number;
    gpa: number;
    totalCredits: number;
    courses: { courseName: string; credits: number; gradePoint: number; grade: string | null }[];
}

export interface CGPAResult {
    currentCGPA: number;
    totalCredits: number;
    totalGradePoints: number;
    semesters: SemesterGPA[];
    scale: string;
}

export interface WhatIfResult {
    targetCGPA: number;
    currentCGPA: number;
    creditsCompleted: number;
    creditsRemaining: number;
    requiredGPA: number;         // GPA needed in remaining semesters
    achievable: boolean;
    strategy: string;
}

// ── CGPA Calculation ───────────────────────────────────────────────────

export async function calculateCGPA(userId: string, scale: GradingScaleKey = "INDIA_10"): Promise<CGPAResult> {
    const courses = await prisma.courseGrade.findMany({
        where: { userId },
        orderBy: [{ semester: "asc" }, { courseName: "asc" }],
    });

    if (courses.length === 0) {
        return {
            currentCGPA: 0,
            totalCredits: 0,
            totalGradePoints: 0,
            semesters: [],
            scale: GRADING_SCALES[scale].name,
        };
    }

    // Group by semester
    const semesterMap = new Map<number, typeof courses>();
    for (const course of courses) {
        if (!semesterMap.has(course.semester)) {
            semesterMap.set(course.semester, []);
        }
        semesterMap.get(course.semester)!.push(course);
    }

    let totalCredits = 0;
    let totalWeightedPoints = 0;
    const semesters: SemesterGPA[] = [];

    for (const [semester, semCourses] of semesterMap.entries()) {
        let semCredits = 0;
        let semWeighted = 0;

        const courseDetails = semCourses.map(c => {
            const gp = c.gradePoint ?? 0;
            semCredits += c.credits;
            semWeighted += gp * c.credits;
            return {
                courseName: c.courseName,
                credits: c.credits,
                gradePoint: gp,
                grade: c.grade,
            };
        });

        const gpa = semCredits > 0 ? Math.round((semWeighted / semCredits) * 100) / 100 : 0;
        totalCredits += semCredits;
        totalWeightedPoints += semWeighted;

        semesters.push({ semester, gpa, totalCredits: semCredits, courses: courseDetails });
    }

    const currentCGPA = totalCredits > 0
        ? Math.round((totalWeightedPoints / totalCredits) * 100) / 100
        : 0;

    return {
        currentCGPA,
        totalCredits,
        totalGradePoints: Math.round(totalWeightedPoints * 100) / 100,
        semesters,
        scale: GRADING_SCALES[scale].name,
    };
}

// ── What-If Simulator ──────────────────────────────────────────────────

export async function whatIfGPA(
    userId: string,
    targetCGPA: number,
    remainingCredits: number,
    scale: GradingScaleKey = "INDIA_10"
): Promise<WhatIfResult> {
    const current = await calculateCGPA(userId, scale);
    const maxGPA = GRADING_SCALES[scale].maxGPA;

    if (current.totalCredits === 0) {
        return {
            targetCGPA,
            currentCGPA: 0,
            creditsCompleted: 0,
            creditsRemaining: remainingCredits,
            requiredGPA: targetCGPA,
            achievable: targetCGPA <= maxGPA,
            strategy: `Start strong! You need a ${targetCGPA} GPA from your first semester.`,
        };
    }

    const totalCreditsAfter = current.totalCredits + remainingCredits;
    const totalPointsNeeded = targetCGPA * totalCreditsAfter;
    const pointsAlready = current.currentCGPA * current.totalCredits;
    const remainingPointsNeeded = totalPointsNeeded - pointsAlready;
    const requiredGPA = remainingCredits > 0
        ? Math.round((remainingPointsNeeded / remainingCredits) * 100) / 100
        : 0;

    const achievable = requiredGPA <= maxGPA && requiredGPA >= 0;

    let strategy: string;
    if (!achievable && requiredGPA > maxGPA) {
        strategy = `Unfortunately, reaching ${targetCGPA} CGPA requires a ${requiredGPA} GPA in remaining courses — exceeds the maximum ${maxGPA}. Consider adjusting your target.`;
    } else if (requiredGPA <= current.currentCGPA * 0.9) {
        strategy = `Great news! You can maintain a relaxed pace. A ${requiredGPA} GPA is well below your current ${current.currentCGPA}.`;
    } else if (requiredGPA <= current.currentCGPA) {
        strategy = `You're on track. Maintain your current performance of ${current.currentCGPA} to surpass your target.`;
    } else {
        const gap = requiredGPA - current.currentCGPA;
        strategy = `You need to improve by ${gap.toFixed(2)} GPA points. Focus on high-credit courses for maximum impact.`;
    }

    return {
        targetCGPA,
        currentCGPA: current.currentCGPA,
        creditsCompleted: current.totalCredits,
        creditsRemaining: remainingCredits,
        requiredGPA,
        achievable,
        strategy,
    };
}

// ── CRUD for Course Grades ─────────────────────────────────────────────

export async function addCourseGrade(
    userId: string,
    data: { courseName: string; credits: number; gradePoint?: number; grade?: string; semester: number }
) {
    return prisma.courseGrade.create({
        data: { userId, ...data },
    });
}

export async function updateCourseGrade(
    id: string,
    userId: string,
    data: Partial<{ courseName: string; credits: number; gradePoint: number; grade: string; semester: number }>
) {
    return prisma.courseGrade.updateMany({
        where: { id, userId },
        data,
    });
}

export async function deleteCourseGrade(id: string, userId: string) {
    return prisma.courseGrade.deleteMany({
        where: { id, userId },
    });
}
