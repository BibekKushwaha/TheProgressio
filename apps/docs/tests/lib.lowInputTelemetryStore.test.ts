import { describe, expect, it, beforeEach } from 'vitest';
import {
    getLowInputTelemetrySnapshot,
    recordLowInputTelemetry,
    resetLowInputTelemetryStoreForTests,
} from '@/lib/lowInputTelemetryStore';

describe('lowInputTelemetryStore', () => {
    beforeEach(() => {
        resetLowInputTelemetryStoreForTests();
    });

    it('aggregates preview and import counters', () => {
        recordLowInputTelemetry('timetable_preview_succeeded', {
            row_count: 3,
            warning_count: 1,
            deterministic_matches: 2,
            ai_matches: 1,
            normalized_lines: 1,
            confidence_high: 1,
            confidence_medium: 1,
            confidence_low: 1,
        });
        recordLowInputTelemetry('timetable_import_completed', {
            imported_rows: 2,
            skipped_rows: 1,
            auto_matched_subjects: 1,
            ambiguous_subjects: 1,
            new_subjects_created: 0,
            confidence_high: 1,
            confidence_medium: 1,
            confidence_low: 0,
        });

        const snapshot = getLowInputTelemetrySnapshot();

        expect(snapshot.metrics.preview_successes).toBe(1);
        expect(snapshot.metrics.preview_rows_total).toBe(3);
        expect(snapshot.metrics.import_completed).toBe(1);
        expect(snapshot.metrics.imported_rows_total).toBe(2);
        expect(snapshot.metrics.subject_ambiguous_total).toBe(1);
        expect(snapshot.lastEventAt).toBeTruthy();
    });

    it('filters metrics by requested keys', () => {
        recordLowInputTelemetry('habit_parse_succeeded', {
            has_schedule_hint: true,
            has_unit: true,
        });

        const snapshot = getLowInputTelemetrySnapshot(['habit_parse_successes']);
        expect(snapshot.metrics).toEqual({
            habit_parse_successes: 1,
        });
    });
});
