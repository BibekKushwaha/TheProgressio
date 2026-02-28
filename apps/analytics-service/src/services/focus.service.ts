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
import { getAnalyticsCache, setAnalyticsCache } from "@repo/cache";
import { simulationService } from "./simulation.service.js";
import { clampInteger } from "./simulation.utils.js";

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
    simulationRuns: number;
    scoreDistribution: ScoreDistributionBucket[];
    rankBands: RankBandProbability[];
    confidenceInterval: {
        lower: number;
        upper: number;
        level: number;
    };
    assumptions: string[];
    confidence: "low" | "medium" | "high";
    modelVersion: string;
    dataQuality: "low" | "medium" | "high";
}

export interface ScoreDistributionBucket {
    score: number;
    probability: number;
    count: number;
}

export interface RankBandProbability {
    label: string;
    probability: number;
    minPercentile: number;
    maxPercentile: number;
}

export interface PredictivePerformanceOptions {
    runs?: number;
    seed?: number;
}

// ── Shared Focus Score (used by standalone endpoint AND the BFF) ───────
//
// Centralising the computation here means both callers share the same
// 60-second Redis cache — if /stats/focus was called recently the BFF
// re-uses the cached result instead of re-querying the DB.

export interface FocusScoreResult {
    score: number;
    breakdown: { consistency: number; intensity: number; depth: number };
    totalSessions: number;
    totalMinutes: number;
    activeDays: number;
    avgHoursPerDay: number;
}

export async function computeFocusScore(
    userId: string,
    dailyGoalHours: number = 4,
): Promise<FocusScoreResult> {
    const cached = await getAnalyticsCache<FocusScoreResult>(userId, "focus-score", "v1");
    if (cached) return cached;

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    // Single-query aggregation — returns 1 row with all 4 metrics instead of
    // transferring every individual session row to Node.js for JS summation.
    type FocusAggRow = {
        total_sessions: bigint;
        total_minutes: bigint;
        active_days: bigint;
        deep_work_count: bigint;
    };

    const [agg] = await prisma.$queryRaw<FocusAggRow[]>`
        SELECT COUNT(*)                                                AS total_sessions,
               COALESCE(SUM(al."durationMinutes"), 0)                 AS total_minutes,
               COUNT(DISTINCT DATE(al."startTime"))                   AS active_days,
               COUNT(*) FILTER (WHERE al."sessionType" = 'DEEP_WORK') AS deep_work_count
        FROM   "ActivityLog" al
        INNER JOIN "Task" t ON al."taskId" = t.id
        WHERE  t."userId"    = ${userId}
          AND  al."startTime" >= ${start}
          AND  al."startTime" <  ${end}
    `;

    const totalSessions = Number(agg?.total_sessions ?? 0);
    const totalMinutes = Number(agg?.total_minutes ?? 0);
    const activeDaysCount = Number(agg?.active_days ?? 0);
    const deepWorkCount = Number(agg?.deep_work_count ?? 0);

    if (totalSessions === 0) {
        const empty: FocusScoreResult = {
            score: 0,
            breakdown: { consistency: 0, intensity: 0, depth: 0 },
            totalSessions: 0, totalMinutes: 0, activeDays: 0, avgHoursPerDay: 0,
        };
        await setAnalyticsCache(userId, "focus-score", empty, "v1", 60);
        return empty;
    }

    const consistencyScore = (activeDaysCount / 7) * 40;
    const avgHoursPerDay = (totalMinutes / 60) / 7;
    const intensityScore = Math.min(30, (avgHoursPerDay / dailyGoalHours) * 30);
    const depthScore = (deepWorkCount / totalSessions) * 30;
    const score = Math.min(100, Math.round(consistencyScore + intensityScore + depthScore));

    const result: FocusScoreResult = {
        score,
        breakdown: {
            consistency: Math.round(consistencyScore),
            intensity: Math.round(intensityScore),
            depth: Math.round(depthScore),
        },
        totalSessions,
        totalMinutes,
        activeDays: activeDaysCount,
        avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
    };

    await setAnalyticsCache(userId, "focus-score", result, "v1", 60);
    return result;
}

// ── Planned vs Actual ──────────────────────────────────────────────────

export async function getPlannedVsActual(userId: string, days: number = 14): Promise<TimeLeakageReport> {
    const cached = await getAnalyticsCache<TimeLeakageReport>(userId, "leakage", String(days));
    if (cached) return cached;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dailyGoalHours: true },
    });
    const dailyGoalMinutes = (user?.dailyGoalHours ?? 4) * 60;

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // DB-level GROUP BY DATE — returns at most `days` rows instead of every
    // raw activity-log row, eliminating the previous findMany + JS loop pattern.
    type DailyRow = { date: Date; actual_minutes: bigint };
    const dailyRows = await prisma.$queryRaw<DailyRow[]>`
        SELECT DATE(al."startTime")                       AS date,
               COALESCE(SUM(al."durationMinutes"), 0)     AS actual_minutes
        FROM   "ActivityLog" al
        INNER JOIN "Task" t ON al."taskId" = t.id
        WHERE  t."userId"    = ${userId}
          AND  al."startTime" >= ${since}
        GROUP BY DATE(al."startTime")
    `;

    // Seed all expected dates to zero, then fill from the query result.
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        dailyMap.set(d.toISOString().split("T")[0]!, 0);
    }

    for (const row of dailyRows) {
        // Postgres DATE returns a Date object; extract ISO date key
        const key = new Date(row.date).toISOString().split("T")[0]!;
        dailyMap.set(key, Number(row.actual_minutes));
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

    const report: TimeLeakageReport = {
        periodDays: days,
        totalPlannedMinutes: totalPlanned,
        totalActualMinutes: totalActual,
        totalLeakageMinutes: totalLeakage,
        leakagePercentage,
        dailyBreakdown,
        worstDays,
        suggestion,
    };
    await setAnalyticsCache(userId, "leakage", report, String(days), 300);
    return report;
}

// ── Peak Productivity Window ───────────────────────────────────────────

export async function detectPeakProductivity(userId: string, days: number = 30): Promise<PeakProductivityResult> {
    const cached = await getAnalyticsCache<PeakProductivityResult>(userId, "peak", String(days));
    if (cached) return cached;

    const since = new Date();
    since.setDate(since.getDate() - days);

    // DB-level GROUP BY HOUR aggregation — returns at most 24 rows regardless
    // of history size, eliminating the previous findMany + JS bucketing pattern
    // that transferred every raw session row to Node.js.
    type HourRow = {
        hour: number;
        session_count: bigint;
        total_mins: bigint;
        deep_work_count: bigint;
    };

    const hourRows = await prisma.$queryRaw<HourRow[]>`
        SELECT EXTRACT(HOUR FROM al."startTime")::int         AS hour,
               COUNT(*)                                       AS session_count,
               COALESCE(SUM(al."durationMinutes"), 0)         AS total_mins,
               COUNT(*) FILTER (WHERE al."sessionType" = 'DEEP_WORK') AS deep_work_count
        FROM   "ActivityLog" al
        INNER JOIN "Task" t ON al."taskId" = t.id
        WHERE  t."userId"    = ${userId}
          AND  al."startTime" >= ${since}
          AND  al."durationMinutes" > 0
        GROUP BY EXTRACT(HOUR FROM al."startTime")
        ORDER BY hour
    `;

    // Build the full 24-slot array; hours with no sessions stay at zero.
    const hourBuckets: { totalMins: number; count: number; deepWorkCount: number }[] = Array.from(
        { length: 24 },
        () => ({ totalMins: 0, count: 0, deepWorkCount: 0 })
    );

    for (const row of hourRows) {
        const h = row.hour;
        if (h >= 0 && h < 24) {
            hourBuckets[h]!.totalMins = Number(row.total_mins);
            hourBuckets[h]!.count = Number(row.session_count);
            hourBuckets[h]!.deepWorkCount = Number(row.deep_work_count);
        }
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

    const peakResult: PeakProductivityResult = {
        peakWindow: { startHour: bestStart, endHour: bestEnd, label },
        efficiencyByHour,
        recommendation: `You are ${efficiencyBoostPercent}% more efficient between ${label}. Schedule your hardest tasks during this window.`,
        efficiencyBoostPercent,
    };
    await setAnalyticsCache(userId, "peak", peakResult, String(days), 1800);
    return peakResult;
}

// ── Learning Pace & Predictive Performance ─────────────────────────────

export async function getPredictivePerformance(
    userId: string,
    examType: string,
    options: PredictivePerformanceOptions = {}
): Promise<LearningPace[]> {
    // Cache key is based on userId+examType only — runs/seed are tuning params
    const cached = await getAnalyticsCache<LearningPace[]>(userId, "predictive", examType);
    if (cached) return cached;

    const entries = await prisma.gradeEntry.findMany({
        where: { userId, examType },
        orderBy: { createdAt: "asc" },
        // Only the fields the simulation loop uses — avoids pulling wide rows
        select: { subjectName: true, obtainedMarks: true, totalMarks: true, createdAt: true },
        // 50 entries per user+examType is statistically sufficient for convergence;
        // taking from the tail (most recent) preserves recency bias intentionally.
        take: 50,
    });

    if (entries.length === 0) return [];

    const simulationRuns = clampInteger(options.runs ?? 2000, 200, 10000);
    const seed = Number.isFinite(options.seed) ? (options.seed as number) : 1337;
    const assumptions = [
        "Historical grade entries represent current preparation trend.",
        "Exam-day variance is approximated with a normal distribution.",
        "Percentile conversion uses a calibrated score-to-percentile mapping.",
    ];

    // Group by subject
    const subjectMap = new Map<string, typeof entries>();
    for (const entry of entries) {
        const name = entry.subjectName.trim();
        if (!subjectMap.has(name)) {
            subjectMap.set(name, []);
        }
        subjectMap.get(name)!.push(entry);
    }

    // Build the per-subject input arrays and hand off to the simulation service.
    // When QUEUE_ENABLED=true the work runs in a concurrency-2 BullMQ worker,
    // preventing >2 simultaneous CPU-heavy loops even under burst load.
    // When QUEUE_ENABLED=false the service falls back to synchronous inline execution.
    const subjects = Array.from(subjectMap.entries()).map(([subjectName, subjectEntries]) => ({
        subjectName,
        scores: subjectEntries.map(e => (e.obtainedMarks / e.totalMarks) * 100),
    }));

    const results = await simulationService.run(userId, subjects, {
        examType,
        simulationRuns,
        seed,
        assumptions,
    });

    // simulationService caches internally when QUEUE_ENABLED (worker writes after computing).
    // Cache here as well to cover the inline (non-queue) path.
    if (results.length > 0) {
        await setAnalyticsCache(userId, "predictive", results, examType, 600);
    }
    return results;
}

// Note: all pure Monte Carlo math functions (normalRandom, buildDistribution,
// buildConfidenceInterval, etc.) have been extracted to simulation.utils.ts
// to allow import from both this module and the BullMQ worker handler.

