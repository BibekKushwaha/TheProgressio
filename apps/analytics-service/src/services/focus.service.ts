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
    entryCount: number;
    confidence: number;
    trend: "improving" | "stable" | "declining";
}

export interface PredictivePerformanceResponse {
    data: LearningPace[];
    confidence: number;
    modelVersion: string;
    dataQuality: {
        sampleSize: number;
        subjectCoverage: number;
        sparseData: boolean;
        label: "low" | "medium" | "high";
        trainingWindowDays: number;
    };
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

// ── Learning Pace & Predictive Performance (Monte Carlo) ───────────────

/**
 * Seed-able pseudo-random number generator (Mulberry32).
 * Ensures reproducible simulation results for the same input data.
 */
function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Run N Monte Carlo simulations to project a future score.
 *
 * For each simulation:
 *   1. Sample a trend from Normal(μ_trend, σ_trend)
 *   2. Sample noise from Normal(0, σ_noise)
 *   3. projected = recentAvg + sampledTrend × stepsAhead + noise
 *   4. Clamp to [0, 100]
 *
 * Returns percentiles (p10, p25, p50, p75, p90) and stats.
 */
function monteCarloScoreProjection(params: {
    recentAvg: number;
    trendPerEntry: number;
    scores: number[];
    stepsAhead?: number;
    simulations?: number;
    seed?: number;
}): {
    p10: number; p25: number; p50: number; p75: number; p90: number;
    mean: number; stdDev: number;
    simulations: number;
} {
    const {
        recentAvg,
        trendPerEntry,
        scores,
        stepsAhead = 3,
        simulations: N = 1000,
        seed = 42,
    } = params;

    const rng = mulberry32(seed);

    // Box-Muller transform for normal distribution
    const normalRandom = (mean: number, std: number): number => {
        const u1 = rng();
        const u2 = rng();
        const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
        return mean + z * std;
    };

    // Compute score volatility (standard deviation of differences)
    let trendStdDev = Math.abs(trendPerEntry) * 0.5; // default fallback
    if (scores.length >= 3) {
        const diffs = [];
        for (let i = 1; i < scores.length; i++) {
            diffs.push(scores[i]! - scores[i - 1]!);
        }
        const diffMean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const variance = diffs.reduce((a, d) => a + (d - diffMean) ** 2, 0) / diffs.length;
        trendStdDev = Math.sqrt(variance);
    }

    // Noise from residual variance around linear trend
    let noiseStdDev = 3; // default fallback
    if (scores.length >= 3) {
        const residuals = scores.map((s, i) => s - (scores[0]! + trendPerEntry * i));
        const resVariance = residuals.reduce((a, r) => a + r * r, 0) / residuals.length;
        noiseStdDev = Math.sqrt(resVariance);
    }

    // Run simulations
    const projected: number[] = [];
    for (let i = 0; i < N; i++) {
        const sampledTrend = normalRandom(trendPerEntry, trendStdDev);
        const noise = normalRandom(0, noiseStdDev);
        const score = Math.min(100, Math.max(0, recentAvg + sampledTrend * stepsAhead + noise));
        projected.push(score);
    }

    projected.sort((a, b) => a - b);

    const percentile = (arr: number[], p: number): number => {
        const idx = Math.ceil((p / 100) * arr.length) - 1;
        return Math.round(arr[Math.max(0, idx)]!);
    };

    const mean = Math.round(projected.reduce((a, b) => a + b, 0) / N);
    const variance = projected.reduce((a, v) => a + (v - mean) ** 2, 0) / N;

    return {
        p10: percentile(projected, 10),
        p25: percentile(projected, 25),
        p50: percentile(projected, 50),
        p75: percentile(projected, 75),
        p90: percentile(projected, 90),
        mean,
        stdDev: Math.round(Math.sqrt(variance)),
        simulations: N,
    };
}

export async function getPredictivePerformance(
    userId: string,
    examType: string
): Promise<PredictivePerformanceResponse> {
    const trainingWindowDays = 180;
    const since = new Date();
    since.setDate(since.getDate() - trainingWindowDays);

    const entries = await prisma.gradeEntry.findMany({
        where: {
            userId,
            examType,
            createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
    });

    if (entries.length === 0) {
        return {
            data: [],
            confidence: 0,
            modelVersion: "montecarlo-v3.0",
            dataQuality: {
                sampleSize: 0,
                subjectCoverage: 0,
                sparseData: true,
                label: "low",
                trainingWindowDays,
            },
        };
    }

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

        const trendPerEntry = scores.length > 1
            ? (scores[scores.length - 1]! - scores[0]!) / (scores.length - 1)
            : 0;
        const sparseData = subjectEntries.length < 4;

        // ── Monte Carlo Simulation ─────────────────────────────────────
        let estimatedExamScore: number;
        let estimatedPercentile: number;
        let mcResults: ReturnType<typeof monteCarloScoreProjection> | null = null;

        if (sparseData) {
            // Too few data points — fall back to simple average
            estimatedExamScore = Math.min(100, Math.max(0, recentAvg));
        } else {
            // Run 1000 Monte Carlo simulations
            mcResults = monteCarloScoreProjection({
                recentAvg,
                trendPerEntry,
                scores,
                stepsAhead: 3,
                simulations: 1000,
                seed: subjectName.length * 31 + subjectEntries.length,
            });
            // Use median (p50) as the estimated score
            estimatedExamScore = mcResults.p50;
        }

        // Percentile mapping from Monte Carlo range or heuristic
        if (mcResults) {
            // Use the spread of the distribution to estimate percentile
            const p90 = mcResults.p90;
            if (p90 >= 95) estimatedPercentile = 99;
            else if (p90 >= 90) estimatedPercentile = 95;
            else if (estimatedExamScore >= 80) estimatedPercentile = 85;
            else if (estimatedExamScore >= 70) estimatedPercentile = 70;
            else if (estimatedExamScore >= 60) estimatedPercentile = 55;
            else if (estimatedExamScore >= 50) estimatedPercentile = 40;
            else estimatedPercentile = 20;
        } else {
            if (estimatedExamScore >= 95) estimatedPercentile = 99;
            else if (estimatedExamScore >= 90) estimatedPercentile = 95;
            else if (estimatedExamScore >= 80) estimatedPercentile = 85;
            else if (estimatedExamScore >= 70) estimatedPercentile = 70;
            else if (estimatedExamScore >= 60) estimatedPercentile = 55;
            else if (estimatedExamScore >= 50) estimatedPercentile = 40;
            else estimatedPercentile = 20;
        }

        // Confidence: higher with more data, penalized by high volatility
        let subjectConfidence = Math.max(
            0.2,
            Math.min(0.95, Math.round((Math.min(subjectEntries.length, 12) / 12) * 100) / 100),
        );
        if (mcResults && mcResults.stdDev > 15) {
            subjectConfidence = Math.max(0.2, subjectConfidence - 0.15);
        }

        let trend: "improving" | "stable" | "declining";
        if (improvementRate > 3) trend = "improving";
        else if (improvementRate < -3) trend = "declining";
        else trend = "stable";

        results.push({
            subjectName,
            recentScoreAvg: recentAvg,
            historicalScoreAvg: historicalAvg,
            improvementRate,
            pace,
            estimatedExamScore,
            estimatedPercentile,
            entryCount: subjectEntries.length,
            confidence: subjectConfidence,
            trend,
        });
    }

    const sampleSize = entries.length;
    const subjectCoverage = results.length;
    const sparseData = sampleSize < 8 || results.some((item) => item.entryCount < 3);
    const confidence = results.length > 0
        ? Math.round((results.reduce((sum, item) => sum + item.confidence, 0) / results.length) * 100) / 100
        : 0;

    let label: "low" | "medium" | "high";
    if (confidence >= 0.75 && !sparseData) label = "high";
    else if (confidence >= 0.45) label = "medium";
    else label = "low";

    return {
        data: results,
        confidence,
        modelVersion: "montecarlo-v3.0",
        dataQuality: {
            sampleSize,
            subjectCoverage,
            sparseData,
            label,
            trainingWindowDays,
        },
    };
}
