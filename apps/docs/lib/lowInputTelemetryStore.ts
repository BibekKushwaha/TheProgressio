type LowInputEvent =
    | 'timetable_preview_requested'
    | 'timetable_preview_succeeded'
    | 'timetable_preview_failed'
    | 'timetable_import_completed'
    | 'habit_parse_requested'
    | 'habit_parse_succeeded'
    | 'habit_parse_failed'
    | 'habit_quick_create_completed';

type LowInputPayload = Record<string, string | number | boolean | null>;

const counters = new Map<string, number>();
let lastEventAt: string | null = null;

const increment = (key: string, by: number = 1) => {
    counters.set(key, (counters.get(key) ?? 0) + by);
};

const readNumber = (payload: LowInputPayload, key: string): number => {
    const value = payload[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const recordLowInputTelemetry = (event: LowInputEvent, payload: LowInputPayload): void => {
    lastEventAt = new Date().toISOString();
    increment(`event_${event}`);

    switch (event) {
        case 'timetable_preview_requested':
            increment('preview_requests');
            break;
        case 'timetable_preview_succeeded':
            increment('preview_successes');
            increment('preview_rows_total', readNumber(payload, 'row_count'));
            increment('preview_warnings_total', readNumber(payload, 'warning_count'));
            increment('parser_deterministic_matches_total', readNumber(payload, 'deterministic_matches'));
            increment('parser_ai_matches_total', readNumber(payload, 'ai_matches'));
            increment('parser_normalized_lines_total', readNumber(payload, 'normalized_lines'));
            increment('confidence_high_total', readNumber(payload, 'confidence_high'));
            increment('confidence_medium_total', readNumber(payload, 'confidence_medium'));
            increment('confidence_low_total', readNumber(payload, 'confidence_low'));
            break;
        case 'timetable_preview_failed':
            increment('preview_failures');
            break;
        case 'timetable_import_completed':
            increment('import_completed');
            increment('imported_rows_total', readNumber(payload, 'imported_rows'));
            increment('skipped_rows_total', readNumber(payload, 'skipped_rows'));
            increment('subject_auto_matched_total', readNumber(payload, 'auto_matched_subjects'));
            increment('subject_ambiguous_total', readNumber(payload, 'ambiguous_subjects'));
            increment('subject_new_total', readNumber(payload, 'new_subjects_created'));
            increment('confidence_high_total', readNumber(payload, 'confidence_high'));
            increment('confidence_medium_total', readNumber(payload, 'confidence_medium'));
            increment('confidence_low_total', readNumber(payload, 'confidence_low'));
            break;
        case 'habit_parse_requested':
            increment('habit_parse_requests');
            break;
        case 'habit_parse_succeeded':
            increment('habit_parse_successes');
            if (payload.has_schedule_hint === true) increment('habit_schedule_hint_detected');
            if (payload.has_unit === true) increment('habit_unit_detected');
            break;
        case 'habit_parse_failed':
            increment('habit_parse_failures');
            break;
        case 'habit_quick_create_completed':
            increment('habit_quick_create_completed');
            if (payload.has_schedule_hint === true) increment('habit_schedule_hint_used');
            if (payload.has_unit === true) increment('habit_unit_used');
            break;
    }
};

export const getLowInputTelemetrySnapshot = (keys?: string[]): { metrics: Record<string, number>; lastEventAt: string | null } => {
    const metrics: Record<string, number> = {};
    const requested = keys && keys.length > 0 ? new Set(keys) : null;

    for (const [key, value] of counters.entries()) {
        if (!requested || requested.has(key)) {
            metrics[key] = value;
        }
    }

    return { metrics, lastEventAt };
};

export const resetLowInputTelemetryStoreForTests = (): void => {
    counters.clear();
    lastEventAt = null;
};
