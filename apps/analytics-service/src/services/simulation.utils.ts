/**
 * Pure Monte Carlo simulation utilities — no I/O, no Prisma, no Redis.
 * Safe to import from both the main thread and BullMQ worker handlers.
 */

import type {
    ScoreDistributionBucket,
    RankBandProbability,
    LearningPace,
} from "./focus.service.js";

// ── Numeric helpers ────────────────────────────────────────────────────

export const clampInteger = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
};

export const clampNumber = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

export const roundToInt = (value: number): number => Math.round(value);

export const mean = (values: number[]): number =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export const stdDev = (values: number[]): number => {
    if (values.length <= 1) return 0;
    const avg = mean(values);
    const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
};

export const getLinearTrend = (values: number[]): number => {
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

export const getAdaptiveStdDev = (scores: number[]): number => {
    const observedStd = stdDev(scores);
    const floor = scores.length < 4 ? 12 : scores.length < 8 ? 9 : 6;
    return clampNumber(Math.max(observedStd, floor), 4, 22);
};

export const hashStringToSeed = (value: string): number => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash || 1;
};

export const mulberry32 = (seed: number): (() => number) => {
    let state = seed >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

export const normalRandom = (meanValue: number, deviation: number, random: () => number): number => {
    const u1 = Math.max(random(), 1e-12);
    const u2 = Math.max(random(), 1e-12);
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return meanValue + z0 * deviation;
};

export const scoreToPercentile = (score: number): number => {
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

export const buildDistribution = (scores: number[], bucketSize: number): ScoreDistributionBucket[] => {
    const bucketCount = Math.ceil(100 / bucketSize) + 1;
    const counts = Array.from({ length: bucketCount }, () => 0);
    for (const score of scores) {
        const bounded = clampNumber(score, 0, 100);
        const bucket = bounded === 100 ? 100 / bucketSize : Math.floor(bounded / bucketSize);
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

export const buildRankBands = (percentiles: number[]): RankBandProbability[] => {
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
    return lowerValue + (upperValue - lowerValue) * (position - lower);
};

export const buildConfidenceInterval = (
    samples: number[],
    level: number
): { lower: number; upper: number; level: number } => {
    const sorted = [...samples].sort((a, b) => a - b);
    const alpha = (100 - level) / 100;
    return {
        lower: roundToInt(quantile(sorted, alpha / 2)),
        upper: roundToInt(quantile(sorted, 1 - alpha / 2)),
        level,
    };
};

export const getDataQuality = (sampleSize: number): "low" | "medium" | "high" => {
    if (sampleSize >= 10) return "high";
    if (sampleSize >= 5) return "medium";
    return "low";
};

export const getConfidenceLabel = (sampleSize: number, deviation: number): "low" | "medium" | "high" => {
    if (sampleSize >= 10 && deviation <= 10) return "high";
    if (sampleSize >= 5 && deviation <= 16) return "medium";
    return "low";
};

// ── Core simulation ────────────────────────────────────────────────────

export interface SubjectSimulationInput {
    subjectName: string;
    scores: number[];
}

export interface SimulationParams {
    examType: string;
    simulationRuns: number;
    seed: number;
    assumptions: string[];
}

/**
 * Runs the Monte Carlo simulation for a single subject.
 * Pure CPU — no async, no I/O, safe to call from any context.
 */
export function simulateSubject(
    input: SubjectSimulationInput,
    params: SimulationParams
): LearningPace {
    const { subjectName, scores } = input;
    const { examType, simulationRuns, seed, assumptions } = params;

    const mid = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, Math.max(1, mid));
    const secondHalf = scores.slice(Math.max(1, mid));

    const historicalAvg = Math.round(mean(firstHalf));
    const recentAvg = Math.round(mean(secondHalf));
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

    const modelAssumptions = [...assumptions];
    if (scores.length < 5) {
        modelAssumptions.push("Sparse subject history detected; confidence is reduced.");
    }

    return {
        subjectName,
        recentScoreAvg: recentAvg,
        historicalScoreAvg: historicalAvg,
        improvementRate,
        pace,
        estimatedExamScore: roundToInt(mean(simulatedScores)),
        estimatedPercentile: roundToInt(mean(simulatedPercentiles)),
        simulationRuns,
        scoreDistribution: buildDistribution(simulatedScores, 10),
        rankBands: buildRankBands(simulatedPercentiles),
        confidenceInterval: buildConfidenceInterval(simulatedScores, 90),
        assumptions: modelAssumptions,
        confidence: getConfidenceLabel(scores.length, scoreStdDev),
        modelVersion: "monte-carlo-v1",
        dataQuality: getDataQuality(scores.length),
    };
}

/**
 * Runs the simulation for all subjects sequentially.
 * Used by both inline invocation and the BullMQ worker handler.
 */
export function simulateAllSubjects(
    subjects: SubjectSimulationInput[],
    params: SimulationParams
): LearningPace[] {
    return subjects.map((subject) => simulateSubject(subject, params));
}
