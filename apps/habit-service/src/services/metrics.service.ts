type MetricName =
    | "duplicate_prevention_hits"
    | "reschedule_operations"
    | "failed_scheduling_attempts"
    | "deduplicated_count"
    | "skipped_due_to_quiet_hours"
    | "wa_fallback_cancelled_by_activity";

const counters = new Map<MetricName, number>();

export const incrementMetric = (name: MetricName, by: number = 1): void => {
    counters.set(name, (counters.get(name) ?? 0) + by);
};

export const getMetricsSnapshot = (): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, value] of counters.entries()) {
        result[key] = value;
    }
    return result;
};

export const logMetricEvent = (event: string, payload: Record<string, unknown>): void => {
    console.info(`[Metrics] ${event}`, payload);
};
