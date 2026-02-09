/**
 * Competitive Exam SWOT Analysis — chapter-wise dashboards for
 * JEE, NEET, UPSC aspirants.
 *
 * Tracks success rates and average time per question to identify
 * specific weak areas requiring targeted revision.
 */
import { prisma } from "@repo/db";

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
    subjectName: string;
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
    const entries = await prisma.gradeEntry.findMany({
        where: { userId, examType },
        orderBy: { createdAt: "desc" },
    });

    if (entries.length === 0) {
        return {
            examType,
            subjects: [],
            overallReadiness: 0,
            topPriorityChapters: [],
        };
    }

    // Group by subject → chapter
    const subjectMap = new Map<string, Map<string, ChapterAnalysis>>();

    for (const entry of entries) {
        if (!subjectMap.has(entry.subjectName)) {
            subjectMap.set(entry.subjectName, new Map());
        }
        const chapterMap = subjectMap.get(entry.subjectName)!;
        const chapterKey = entry.chapter ?? "General";

        if (!chapterMap.has(chapterKey)) {
            chapterMap.set(chapterKey, {
                subjectName: entry.subjectName,
                chapter: chapterKey,
                totalAttempts: 0,
                totalMarks: 0,
                obtainedMarks: 0,
                successRate: 0,
                avgTimePerQuestion: 0,
                totalTimeMins: 0,
                rating: "average",
            });
        }

        const analysis = chapterMap.get(chapterKey)!;
        analysis.totalAttempts++;
        analysis.totalMarks += entry.totalMarks;
        analysis.obtainedMarks += entry.obtainedMarks;
        analysis.totalTimeMins += entry.timeTakenMins ?? 0;
    }

    // Calculate rates and ratings
    const allChapters: ChapterAnalysis[] = [];
    const subjects: SubjectSWOT[] = [];

    for (const [subjectName, chapterMap] of subjectMap.entries()) {
        const chapters: ChapterAnalysis[] = [];

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
            subjectName,
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

    return { examType, subjects, overallReadiness, topPriorityChapters };
}

// ── Subject-level Analytics ────────────────────────────────────────────

export async function getSubjectPerformance(userId: string, subjectName: string) {
    const entries = await prisma.gradeEntry.findMany({
        where: { userId, subjectName },
        orderBy: { createdAt: "asc" },
    });

    if (entries.length === 0) return null;

    // Calculate learning pace (improvement between first and last attempts)
    const first5 = entries.slice(0, Math.min(5, entries.length));
    const last5 = entries.slice(-Math.min(5, entries.length));

    const earlyRate = first5.reduce((sum, e) => sum + (e.obtainedMarks / e.totalMarks), 0) / first5.length;
    const recentRate = last5.reduce((sum, e) => sum + (e.obtainedMarks / e.totalMarks), 0) / last5.length;

    const improvementRate = Math.round((recentRate - earlyRate) * 100);

    // Time trend per question
    const timeTrend = entries
        .filter(e => e.timeTakenMins !== null)
        .map(e => ({
            date: e.createdAt.toISOString().split("T")[0],
            timePerQuestion: e.timeTakenMins!,
            score: Math.round((e.obtainedMarks / e.totalMarks) * 100),
        }));

    return {
        subjectName,
        totalEntries: entries.length,
        averageScore: Math.round(
            entries.reduce((sum, e) => sum + (e.obtainedMarks / e.totalMarks) * 100, 0) / entries.length
        ),
        improvementRate,
        learningPace: improvementRate > 5 ? "accelerating" : improvementRate > 0 ? "steady" : "declining",
        timeTrend,
    };
}
