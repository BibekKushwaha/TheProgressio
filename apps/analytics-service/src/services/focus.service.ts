/**
 * Focus Intensity & Time-Leakage Tracking
 *
 * Analyzes:
 * 1. Planned vs Actual study hours
 * 2. Peak Productivity Window detection
 * 3. Time leakage identification
 * 4. Session quality analysis by hour of day
 */
import { prisma } from "@repo/db";

// ── Types ──────────────────────────────────────────────────────────────

export interface PlannedVsActual {
    date: string;
    plannedMinutes: number;
    actualMinutes: number;
    leakageMinutes: number;
    leakagePercent: number;
}

export interface PeakProductivityResult {
    peakWindow: { startHour: number; endHour: number; label: string };
    efficiencyByHour: { hour: number; avgMinutes: number; sessionCount: number; avgFocusRatio: number }[];
    recommendation: string;
    efficiencyBoostPercent: number;  // "You are X% more efficient during peak"
}

export interface TimeLeakageReport {
    periodDays: number;
    totalPlannedMinutes: number;
    totalActualMinutes: number;
    totalLeakageMinutes: number;
    leakagePercentage: number;
    dailyBreakdown: PlannedVsActual[];
    worstDays: PlannedVsActual[];
    suggestion: string;
}

export interface LearningPace {
    subjectName: string;
    recentScoreAvg: number;
    historicalScoreAvg: number;
    improvementRate: number;     // percentage points
    pace: "accelerating" | "steady" | "declining";
    estimatedExamScore: number;
    estimatedPercentile: number;
}

// ── Planned vs Actual ──────────────────────────────────────────────────

export async function getPlannedVsActual(userId: string, days: number = 14): Promise<TimeLeakageReport> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailyGoalHours: true },
    });
    const dailyGoalMinutes = (user?.dailyGoalHours ?? 4) * 60;

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const activityLogs = await prisma.activityLog.findMany({
        where: {
            task: { userId },
            startTime: { gte: since },
        },
        select: { startTime: true, durationMinutes: true },
    });

    // Build daily map
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        dailyMap.set(d.toISOString().split("T")[0]!, 0);
    }

    for (const log of activityLogs) {
        const key = log.startTime.toISOString().split("T")[0]!;
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + (log.durationMinutes ?? 0));
    }

    const dailyBreakdown: PlannedVsActual[] = [];
    let totalPlanned = 0;
    let totalActual = 0;

    for (const [date, actual] of dailyMap.entries()) {
        const leakage = Math.max(0, dailyGoalMinutes - actual);
        dailyBreakdown.push({
            date,
            plannedMinutes: dailyGoalMinutes,
            actualMinutes: actual,
            leakageMinutes: leakage,
            leakagePercent: dailyGoalMinutes > 0 ? Math.round((leakage / dailyGoalMinutes) * 100) : 0,
        });
        totalPlanned += dailyGoalMinutes;
        totalActual += actual;
    }

    const totalLeakage = Math.max(0, totalPlanned - totalActual);
    const worstDays = [...dailyBreakdown]
        .sort((a, b) => b.leakagePercent - a.leakagePercent)
        .slice(0, 3);

    const leakagePercentage = totalPlanned > 0 ? Math.round((totalLeakage / totalPlanned) * 100) : 0;

    let suggestion = "";
    if (leakagePercentage > 50) {
        suggestion = "Significant time leakage detected. Try blocking distracting apps during your planned study windows.";
    } else if (leakagePercentage > 25) {
        suggestion = "Moderate leakage. Consider shorter, more focused sessions with breaks in between.";
    } else {
        suggestion = "Great focus discipline! You're hitting close to your daily goals.";
    }

    return {
        periodDays: days,
        totalPlannedMinutes: totalPlanned,
        totalActualMinutes: totalActual,
        totalLeakageMinutes: totalLeakage,
        leakagePercentage,
        dailyBreakdown,
        worstDays,
        suggestion,
    };
}

// ── Peak Productivity Window ───────────────────────────────────────────

export async function detectPeakProductivity(userId: string, days: number = 30): Promise<PeakProductivityResult> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const sessions = await prisma.activityLog.findMany({
        where: {
            task: { userId },
            startTime: { gte: since },
            durationMinutes: { gt: 0 },
        },
        select: { startTime: true, durationMinutes: true, sessionType: true },
    });

    // Group by hour of day
    const hourBuckets: { totalMins: number; count: number; deepWorkCount: number }[] = Array.from(
        { length: 24 },
        () => ({ totalMins: 0, count: 0, deepWorkCount: 0 })
    );

    for (const s of sessions) {
        const hour = s.startTime.getHours();
        hourBuckets[hour]!.totalMins += s.durationMinutes ?? 0;
        hourBuckets[hour]!.count++;
        if (s.sessionType === "DEEP_WORK") hourBuckets[hour]!.deepWorkCount++;
    }

    const efficiencyByHour = hourBuckets.map((b, hour) => ({
        hour,
        avgMinutes: b.count > 0 ? Math.round(b.totalMins / b.count) : 0,
        sessionCount: b.count,
        avgFocusRatio: b.count > 0 ? Math.round((b.deepWorkCount / b.count) * 100) : 0,
    }));

    // Find 2-hour window with highest average minutes
    let bestStart = 9;
    let bestScore = 0;

    for (let h = 5; h <= 22; h++) {
        const score = (efficiencyByHour[h]?.avgMinutes ?? 0) + (efficiencyByHour[h + 1]?.avgMinutes ?? 0);
        if (score > bestScore) {
            bestScore = score;
            bestStart = h;
        }
    }

    const bestEnd = bestStart + 2;
    const formatHour = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;
    const label = `${formatHour(bestStart)} – ${formatHour(bestEnd)}`;

    // Calculate efficiency boost
    const peakAvg = bestScore / 2;
    const overallAvg = efficiencyByHour.reduce((sum, e) => sum + e.avgMinutes, 0) /
        Math.max(1, efficiencyByHour.filter(e => e.sessionCount > 0).length);
    const efficiencyBoostPercent = overallAvg > 0
        ? Math.round(((peakAvg - overallAvg) / overallAvg) * 100)
        : 0;

    return {
        peakWindow: { startHour: bestStart, endHour: bestEnd, label },
        efficiencyByHour,
        recommendation: `You are ${efficiencyBoostPercent}% more efficient between ${label}. Schedule your hardest tasks during this window.`,
        efficiencyBoostPercent,
    };
}

// ── Learning Pace & Predictive Performance ─────────────────────────────

export async function getPredictivePerformance(
    userId: string,
    examType: string
): Promise<LearningPace[]> {
    const entries = await prisma.gradeEntry.findMany({
        where: { userId, examType },
        orderBy: { createdAt: "asc" },
    });

    if (entries.length === 0) return [];

    // Group by subject
    const subjectMap = new Map<string, typeof entries>();
    for (const entry of entries) {
        if (!subjectMap.has(entry.subjectName)) {
            subjectMap.set(entry.subjectName, []);
        }
        subjectMap.get(entry.subjectName)!.push(entry);
    }

    const results: LearningPace[] = [];

    for (const [subjectName, subjectEntries] of subjectMap.entries()) {
        const scores = subjectEntries.map(e => (e.obtainedMarks / e.totalMarks) * 100);

        // Split into first half and second half
        const mid = Math.floor(scores.length / 2);
        const firstHalf = scores.slice(0, Math.max(1, mid));
        const secondHalf = scores.slice(Math.max(1, mid));

        const historicalAvg = Math.round(firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length);
        const recentAvg = Math.round(secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length);
        const improvementRate = recentAvg - historicalAvg;

        let pace: "accelerating" | "steady" | "declining";
        if (improvementRate > 5) pace = "accelerating";
        else if (improvementRate >= -2) pace = "steady";
        else pace = "declining";

        // Simple linear extrapolation for exam score prediction
        const trendPerEntry = scores.length > 1
            ? (scores[scores.length - 1]! - scores[0]!) / (scores.length - 1)
            : 0;
        const estimatedExamScore = Math.min(100, Math.max(0, Math.round(recentAvg + trendPerEntry * 3)));

        // Rough percentile mapping based on estimated score
        let estimatedPercentile;
        if (estimatedExamScore >= 95) estimatedPercentile = 99;
        else if (estimatedExamScore >= 90) estimatedPercentile = 95;
        else if (estimatedExamScore >= 80) estimatedPercentile = 85;
        else if (estimatedExamScore >= 70) estimatedPercentile = 70;
        else if (estimatedExamScore >= 60) estimatedPercentile = 55;
        else if (estimatedExamScore >= 50) estimatedPercentile = 40;
        else estimatedPercentile = 20;

        results.push({
            subjectName,
            recentScoreAvg: recentAvg,
            historicalScoreAvg: historicalAvg,
            improvementRate,
            pace,
            estimatedExamScore,
            estimatedPercentile,
        });
    }

    return results;
}
