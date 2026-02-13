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
    examType: string,
    options: PredictivePerformanceOptions = {}
): Promise<LearningPace[]> {
    const entries = await prisma.gradeEntry.findMany({
        where: { userId, examType },
        orderBy: { createdAt: "asc" },
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

        const trendPerEntry = getLinearTrend(scores);
        const expectedScore = clampNumber(recentAvg + trendPerEntry * 3, 0, 100);
        const scoreStdDev = getAdaptiveStdDev(scores);
        const seededRandom = mulberry32(hashStringToSeed(`${subjectName}:${examType}:${seed}:${scores.length}`));

        const simulatedScores: number[] = [];
        const simulatedPercentiles: number[] = [];
        for (let i = 0; i < simulationRuns; i++) {
            const sampleScore = clampNumber(normalRandom(expectedScore, scoreStdDev, seededRandom), 0, 100);
            simulatedScores.push(sampleScore);
            simulatedPercentiles.push(scoreToPercentile(sampleScore));
        }

        const estimatedExamScore = roundToInt(mean(simulatedScores));
        const estimatedPercentile = roundToInt(mean(simulatedPercentiles));
        const confidenceInterval = buildConfidenceInterval(simulatedScores, 90);
        const rankBands = buildRankBands(simulatedPercentiles);
        const scoreDistribution = buildDistribution(simulatedScores, 10);

        const dataQuality = getDataQuality(subjectEntries.length);
        const confidence = getConfidenceLabel(subjectEntries.length, scoreStdDev);

        const modelAssumptions = [...assumptions];
        if (subjectEntries.length < 5) {
            modelAssumptions.push("Sparse subject history detected; confidence is reduced.");
        }

        results.push({
            subjectName,
            recentScoreAvg: recentAvg,
            historicalScoreAvg: historicalAvg,
            improvementRate,
            pace,
            estimatedExamScore,
            estimatedPercentile,
            simulationRuns,
            scoreDistribution,
            rankBands,
            confidenceInterval,
            assumptions: modelAssumptions,
            confidence,
            modelVersion: "monte-carlo-v1",
            dataQuality,
        });
    }

    return results;
}

const clampInteger = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
};

const clampNumber = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

const roundToInt = (value: number): number => Math.round(value);

const mean = (values: number[]): number =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const stdDev = (values: number[]): number => {
    if (values.length <= 1) return 0;
    const avg = mean(values);
    const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
};

const getLinearTrend = (values: number[]): number => {
    if (values.length <= 1) return 0;

    const xAvg = (values.length - 1) / 2;
    const yAvg = mean(values);

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < values.length; i++) {
        const x = i - xAvg;
        const y = values[i]! - yAvg;
        numerator += x * y;
        denominator += x ** 2;
    }

    return denominator === 0 ? 0 : numerator / denominator;
};

const getAdaptiveStdDev = (scores: number[]): number => {
    const observedStd = stdDev(scores);
    const floor = scores.length < 4 ? 12 : scores.length < 8 ? 9 : 6;
    const ceiling = 22;
    return clampNumber(Math.max(observedStd, floor), 4, ceiling);
};

const hashStringToSeed = (value: string): number => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash || 1;
};

const mulberry32 = (seed: number): (() => number) => {
    let state = seed >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const normalRandom = (meanValue: number, deviation: number, random: () => number): number => {
    const u1 = Math.max(random(), 1e-12);
    const u2 = Math.max(random(), 1e-12);
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return meanValue + z0 * deviation;
};

const scoreToPercentile = (score: number): number => {
    if (score >= 98) return 99.7;
    if (score >= 95) return 99;
    if (score >= 90) return 96;
    if (score >= 85) return 90;
    if (score >= 80) return 84;
    if (score >= 75) return 76;
    if (score >= 70) return 67;
    if (score >= 60) return 52;
    if (score >= 50) return 38;
    return 20;
};

const buildDistribution = (scores: number[], bucketSize: number): ScoreDistributionBucket[] => {
    const bucketCount = Math.ceil(100 / bucketSize) + 1;
    const counts = Array.from({ length: bucketCount }, () => 0);

    for (const score of scores) {
        const bounded = clampNumber(score, 0, 100);
        const bucket = bounded === 100
            ? 100 / bucketSize
            : Math.floor(bounded / bucketSize);
        counts[bucket]! += 1;
    }

    return counts
        .map((count, index) => ({
            score: index * bucketSize,
            count,
            probability: scores.length > 0 ? Number((count / scores.length).toFixed(4)) : 0,
        }))
        .filter((item) => item.count > 0);
};

const buildRankBands = (percentiles: number[]): RankBandProbability[] => {
    const bands = [
        { label: "Top 1%", minPercentile: 99, maxPercentile: 100 },
        { label: "Top 5%", minPercentile: 95, maxPercentile: 99 },
        { label: "Top 15%", minPercentile: 85, maxPercentile: 95 },
        { label: "Top 30%", minPercentile: 70, maxPercentile: 85 },
        { label: "Below Top 30%", minPercentile: 0, maxPercentile: 70 },
    ];

    return bands.map((band, index) => {
        const isLastBand = index === bands.length - 1;
        const count = percentiles.filter((value) =>
            isLastBand
                ? value >= band.minPercentile && value <= band.maxPercentile
                : value >= band.minPercentile && value < band.maxPercentile
        ).length;

        return {
            ...band,
            probability: percentiles.length > 0 ? Number((count / percentiles.length).toFixed(4)) : 0,
        };
    });
};

const quantile = (sortedValues: number[], q: number): number => {
    if (sortedValues.length === 0) return 0;
    const boundedQ = clampNumber(q, 0, 1);
    const position = (sortedValues.length - 1) * boundedQ;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const lowerValue = sortedValues[lower] ?? sortedValues[0]!;
    const upperValue = sortedValues[upper] ?? sortedValues[sortedValues.length - 1]!;
    const weight = position - lower;
    return lowerValue + (upperValue - lowerValue) * weight;
};

const buildConfidenceInterval = (
    samples: number[],
    level: number
): { lower: number; upper: number; level: number } => {
    const sorted = [...samples].sort((a, b) => a - b);
    const alpha = (100 - level) / 100;
    const lower = quantile(sorted, alpha / 2);
    const upper = quantile(sorted, 1 - alpha / 2);

    return {
        lower: roundToInt(lower),
        upper: roundToInt(upper),
        level,
    };
};

const getDataQuality = (sampleSize: number): "low" | "medium" | "high" => {
    if (sampleSize >= 10) return "high";
    if (sampleSize >= 5) return "medium";
    return "low";
};

const getConfidenceLabel = (sampleSize: number, deviation: number): "low" | "medium" | "high" => {
    if (sampleSize >= 10 && deviation <= 10) return "high";
    if (sampleSize >= 5 && deviation <= 16) return "medium";
    return "low";
};
