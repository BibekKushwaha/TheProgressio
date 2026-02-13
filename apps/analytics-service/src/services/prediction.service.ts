/**
 * Phase 3: Prediction Engine — ML-lite task duration prediction
 * using Three-Point Estimation (PERT formula):
 *   E = (O + 4P + Pe) / 6
 * where O = optimistic, P = probable (most likely), Pe = pessimistic
 *
 * Also provides cycle-time percentile analysis (50th, 85th, 95th).
 */
import { prisma } from "@repo/db";

// ── Types ──────────────────────────────────────────────────────────────

export interface DurationPrediction {
    taskTitle: string;
    categoryName: string | null;
    subjectName: string | null;
    sampleSize: number;
    optimistic: number;      // minutes
    probable: number;         // minutes (mode)
    pessimistic: number;      // minutes
    expected: number;         // PERT E = (O + 4P + Pe) / 6
    standardDeviation: number; // σ = (Pe - O) / 6
    confidence: "low" | "medium" | "high";
}

export interface CycleTimePercentiles {
    p50: number;  // 50th percentile
    p85: number;  // 85th percentile
    p95: number;  // 95th percentile
    mean: number;
    dataPoints: { taskTitle: string; minutes: number; completedAt: string }[];
}

// ── Duration Prediction ────────────────────────────────────────────────

export async function predictTaskDuration(
    userId: string,
    options: { categoryId?: string; subjectId?: string; taskTitle?: string; taskId?: string }
): Promise<DurationPrediction> {
    // Find similar completed tasks with activity logs
    const where: any = {
        userId,
        status: "COMPLETED",
    };
    if (options.categoryId) where.categoryId = options.categoryId;
    if (options.subjectId) where.subjectId = options.subjectId;
    if (options.taskId) where.id = options.taskId;

    const tasks = await prisma.task.findMany({
        where,
        include: {
            activityLogs: true,
            category: true,
            subject: true,
            taskCompletionStat: true,
        },
    });

    // Calculate total minutes per task
    const durations: number[] = [];
    for (const task of tasks) {
        const total = task.activityLogs.reduce(
            (sum, log) => sum + (log.durationMinutes ?? 0), 0
        );
        if (total > 0) durations.push(total);
    }

    if (durations.length === 0) {
        return {
            taskTitle: options.taskTitle ?? "Unknown",
            categoryName: null,
            subjectName: null,
            sampleSize: 0,
            optimistic: 0,
            probable: 0,
            pessimistic: 0,
            expected: 0,
            standardDeviation: 0,
            confidence: "low",
        };
    }

    durations.sort((a, b) => a - b);

    const optimistic = durations[0]!;
    const pessimistic = durations[durations.length - 1]!;

    // Mode approximation: use median
    const midIdx = Math.floor(durations.length / 2);
    const probable = durations.length % 2 === 0
        ? Math.round((durations[midIdx - 1]! + durations[midIdx]!) / 2)
        : durations[midIdx]!;

    // PERT: E = (O + 4P + Pe) / 6
    const expected = Math.round((optimistic + 4 * probable + pessimistic) / 6);
    const standardDeviation = Math.round((pessimistic - optimistic) / 6);

    const confidence = durations.length >= 10 ? "high"
        : durations.length >= 5 ? "medium" : "low";

    const categoryName = tasks[0]?.category?.name ?? null;
    const subjectName = tasks[0]?.subject?.name ?? null;

    return {
        taskTitle: options.taskTitle ?? "Similar tasks",
        categoryName,
        subjectName,
        sampleSize: durations.length,
        optimistic,
        probable,
        pessimistic,
        expected,
        standardDeviation,
        confidence,
    };
}

// ── Cycle Time Percentiles ─────────────────────────────────────────────

export async function getCycleTimePercentiles(
    userId: string,
    options?: { categoryId?: string; subjectId?: string; days?: number }
): Promise<CycleTimePercentiles> {
    const daysBack = options?.days ?? 90;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const where: any = {
        userId,
        completedAt: { gte: since },
    };

    const stats = await prisma.taskCompletionStat.findMany({
        where,
        include: { task: { include: { category: true, subject: true } } },
        orderBy: { completedAt: "desc" },
    });

    // Filter by category/subject if specified
    let filtered = stats;
    if (options?.categoryId) {
        filtered = filtered.filter(s => s.task?.categoryId === options.categoryId);
    }
    if (options?.subjectId) {
        filtered = filtered.filter(s => s.task?.subjectId === options.subjectId);
    }

    const minutes = filtered.map(s => s.totalMinutes).sort((a, b) => a - b);

    if (minutes.length === 0) {
        return { p50: 0, p85: 0, p95: 0, mean: 0, dataPoints: [] };
    }

    const percentile = (arr: number[], p: number): number => {
        const idx = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, idx)]!;
    };

    const mean = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length);

    return {
        p50: percentile(minutes, 50),
        p85: percentile(minutes, 85),
        p95: percentile(minutes, 95),
        mean,
        dataPoints: filtered.map(s => ({
            taskTitle: s.task?.title ?? "Unknown",
            minutes: s.totalMinutes,
            completedAt: s.completedAt.toISOString(),
        })),
    };
}
