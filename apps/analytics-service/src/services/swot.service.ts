/**
 * Competitive Exam SWOT Analysis — chapter-wise dashboards for
 * JEE, NEET, UPSC aspirants.
 *
 * Tracks success rates and average time per question to identify
 * specific weak areas requiring targeted revision.
 */
import { prisma } from "@repo/db";
import { getAnalyticsCache, setAnalyticsCache } from "@repo/cache";

// ── Types ──────────────────────────────────────────────────────────────

export interface ChapterAnalysis {
    subjectName: string;
    chapter: string;
    totalAttempts: number;
    totalMarks: number;
    obtainedMarks: number;
    successRate: number;          // percentage
    avgTimePerQuestion: number;   // minutes
    totalTimeMins: number;
    rating: "strength" | "average" | "weakness" | "critical";
}

export interface SubjectSWOT {
    subject: string;
    overallScore: number;
    strengths: ChapterAnalysis[];
    weaknesses: ChapterAnalysis[];
    opportunities: ChapterAnalysis[];  // average but improvable
    threats: ChapterAnalysis[];         // critical + upcoming exams
}

export interface FullSWOT {
    examType: string;
    subjects: SubjectSWOT[];
    overallReadiness: number;   // 0-100
    topPriorityChapters: ChapterAnalysis[];
}

// ── SWOT Engine ────────────────────────────────────────────────────────

export async function generateSWOT(userId: string, examType: string): Promise<FullSWOT> {
    // ── Cache check ────────────────────────────────────────────────────
    const cached = await getAnalyticsCache<FullSWOT>(userId, "swot", examType);
    if (cached) return cached;

    // ── DB-level aggregation (single round-trip instead of N rows) ─────
    const grouped = await prisma.gradeEntry.groupBy({
        by: ["subjectName", "chapter"],
        where: { userId, examType },
        _sum: { totalMarks: true, obtainedMarks: true, timeTakenMins: true },
        _count: { id: true },
    });

    if (grouped.length === 0) {
        return {
            examType,
            subjects: [],
            overallReadiness: 0,
            topPriorityChapters: [],
        };
    }

    // Re-build the subject→chapter map from the aggregated rows
    // Map<normalizedSubject, Map<chapterKey, ChapterAnalysis>>
    const subjectMap = new Map<string, Map<string, ChapterAnalysis>>();

    for (const row of grouped) {
        const normalizedSubject = row.subjectName.trim().toLowerCase();
        if (!subjectMap.has(normalizedSubject)) {
            subjectMap.set(normalizedSubject, new Map());
        }
        const chapterMap = subjectMap.get(normalizedSubject)!;
        const chapterKey = row.chapter ?? "General";

        chapterMap.set(chapterKey, {
            subjectName: row.subjectName.trim(),
            chapter: chapterKey,
            totalAttempts: row._count.id,
            totalMarks: row._sum.totalMarks ?? 0,
            obtainedMarks: row._sum.obtainedMarks ?? 0,
            successRate: 0,
            avgTimePerQuestion: 0,
            totalTimeMins: row._sum.timeTakenMins ?? 0,
            rating: "average",
        });
    }

    // Calculate rates and ratings
    const allChapters: ChapterAnalysis[] = [];
    const subjects: SubjectSWOT[] = [];

    for (const [, chapterMap] of subjectMap.entries()) {
        const chapters: ChapterAnalysis[] = [];

        // Get display name from the first chapter analysis
        let displaySubjectName = "Unknown Subject";
        const firstChapter = chapterMap.values().next().value;
        if (firstChapter) {
            displaySubjectName = firstChapter.subjectName;
        }

        for (const [, analysis] of chapterMap.entries()) {
            analysis.successRate = analysis.totalMarks > 0
                ? Math.round((analysis.obtainedMarks / analysis.totalMarks) * 100)
                : 0;
            analysis.avgTimePerQuestion = analysis.totalAttempts > 0
                ? Math.round((analysis.totalTimeMins / analysis.totalAttempts) * 10) / 10
                : 0;

            // Classify
            if (analysis.successRate >= 80) analysis.rating = "strength";
            else if (analysis.successRate >= 60) analysis.rating = "average";
            else if (analysis.successRate >= 40) analysis.rating = "weakness";
            else analysis.rating = "critical";

            chapters.push(analysis);
            allChapters.push(analysis);
        }

        const overallScore = chapters.length > 0
            ? Math.round(chapters.reduce((sum, c) => sum + c.successRate, 0) / chapters.length)
            : 0;

        subjects.push({
            subject: displaySubjectName,
            overallScore,
            strengths: chapters.filter(c => c.rating === "strength"),
            weaknesses: chapters.filter(c => c.rating === "weakness"),
            opportunities: chapters.filter(c => c.rating === "average"),
            threats: chapters.filter(c => c.rating === "critical"),
        });
    }

    // Overall readiness
    const overallReadiness = allChapters.length > 0
        ? Math.round(allChapters.reduce((sum, c) => sum + c.successRate, 0) / allChapters.length)
        : 0;

    // Top priority: worst chapters by success rate
    const topPriorityChapters = allChapters
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 10);

    const result: FullSWOT = { examType, subjects, overallReadiness, topPriorityChapters };
    await setAnalyticsCache(userId, "swot", result, examType);
    return result;
}

// ── Subject-level Analytics ────────────────────────────────────────────

export async function getSubjectPerformance(userId: string, subjectName: string) {
    const normalizedName = subjectName.trim().toLowerCase();
    const cached = await getAnalyticsCache<ReturnType<typeof _buildSubjectResult>>(userId, "subject", normalizedName);
    if (cached) return cached;

    const where = {
        userId,
        subjectName: { equals: subjectName.trim(), mode: 'insensitive' as const },
    };

    // 1. Aggregate for average score — avoids pulling all rows just to compute mean
    const agg = await prisma.gradeEntry.aggregate({
        where,
        _avg: { obtainedMarks: true, totalMarks: true },
        _count: { id: true },
    });

    if (!agg._count.id || agg._count.id === 0) return null;

    // 2. Fetch first 5 + last 5 in parallel for improvement rate — O(10) vs O(N)
    const [first5, last5Raw] = await Promise.all([
        prisma.gradeEntry.findMany({
            where,
            orderBy: { createdAt: "asc" },
            select: { obtainedMarks: true, totalMarks: true, timeTakenMins: true, createdAt: true },
            take: 5,
        }),
        prisma.gradeEntry.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: { obtainedMarks: true, totalMarks: true, timeTakenMins: true, createdAt: true },
            take: 5,
        }),
    ]);
    // Reverse desc result so timeTrend is chronological
    const last5 = [...last5Raw].reverse();

    const earlyRate = first5.reduce((sum, e) => sum + (e.obtainedMarks / e.totalMarks), 0) / first5.length;
    const recentRate = last5.reduce((sum, e) => sum + (e.obtainedMarks / e.totalMarks), 0) / last5.length;
    const improvementRate = Math.round((recentRate - earlyRate) * 100);

    // 3. Fetch up to 50 entries for timeTrend (capped — statistically representative)
    const trendEntries = await prisma.gradeEntry.findMany({
        where,
        orderBy: { createdAt: "asc" },
        select: { obtainedMarks: true, totalMarks: true, timeTakenMins: true, createdAt: true },
        take: 50,
    });

    const timeTrend = trendEntries
        .filter(e => e.timeTakenMins !== null)
        .flatMap(e => {
            const date = e.createdAt.toISOString().split("T")[0];
            if (!date) return [];
            return [{ date, timePerQuestion: e.timeTakenMins!, score: Math.round((e.obtainedMarks / e.totalMarks) * 100) }];
        });

    const avgScore = agg._avg.totalMarks && agg._avg.totalMarks > 0
        ? Math.round(((agg._avg.obtainedMarks ?? 0) / agg._avg.totalMarks) * 100)
        : 0;

    const result = {
        subjectName,
        totalEntries: agg._count.id,
        averageScore: avgScore,
        avgScore,
        entryCount: agg._count.id,
        trend: improvementRate > 5 ? "improving" : improvementRate < -5 ? "declining" : "stable",
        improvementRate,
        learningPace: improvementRate > 5 ? "accelerating" : improvementRate > 0 ? "steady" : "declining" as const,
        timeTrend,
    };
    await setAnalyticsCache(userId, "subject", result, normalizedName, 300);
    return result;
}

function _buildSubjectResult(
    subjectName: string,
    entries: { obtainedMarks: number; totalMarks: number; timeTakenMins: number | null; createdAt: Date }[],
    improvementRate: number,
    timeTrend: { date: string; timePerQuestion: number; score: number }[],
) {
    return {
        subjectName,
        totalEntries: entries.length,
        averageScore: Math.round(
            entries.reduce((sum, e) => sum + (e.obtainedMarks / e.totalMarks) * 100, 0) / entries.length
        ),
        improvementRate,
        learningPace: improvementRate > 5 ? "accelerating" : improvementRate > 0 ? "steady" : "declining" as const,
        timeTrend,
    };
}
