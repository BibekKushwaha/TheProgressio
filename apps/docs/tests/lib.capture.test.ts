import { describe, expect, it } from 'vitest';
import { toCapturedHabitDraft, toCapturedTimetableDrafts } from '@/lib/capture';
import { Frequency } from '@repo/store';

describe('capture helpers', () => {
    it('wraps a parsed habit response as a captured habit draft', () => {
        const result = toCapturedHabitDraft({
            name: 'Revise Chemistry',
            frequency: Frequency.DAILY,
            targetValue: 20,
            unit: 'minutes',
            linkedCategoryName: 'Chemistry',
            scheduleHint: 'night',
            confidence: 0.86,
        });

        expect(result.type).toBe('habit');
        expect(result.source).toBe('text');
        expect(result.draft.name).toBe('Revise Chemistry');
        expect(result.draft.scheduleHint).toBe('night');
        expect(result.confidence).toBe(0.86);
    });

    it('wraps timetable preview rows as captured timetable drafts', () => {
        const result = toCapturedTimetableDrafts([
            {
                subjectName: 'Math',
                dayOfWeek: 1,
                startTime: '09:00',
                endTime: '10:00',
                rotation: 'A',
                confidence: 0.8,
            },
        ], 'pdf');

        expect(result).toHaveLength(1);
        expect(result[0]?.type).toBe('timetable_entry');
        expect(result[0]?.source).toBe('pdf');
        expect(result[0]?.draft.subjectName).toBe('Math');
    });
});
