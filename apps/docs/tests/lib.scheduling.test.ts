import { describe, expect, it, vi } from 'vitest';

import { buildScheduledIso, toApparentUtcIso } from '../lib/scheduling';

describe('scheduling helpers', () => {
    it('converts a date to apparent UTC ISO', () => {
        const date = new Date('2026-03-11T09:30:00');
        expect(toApparentUtcIso(date)).toBe('2026-03-11T09:30:00.000Z');
    });

    it('builds an ISO string from date and time', () => {
        expect(buildScheduledIso('2026-03-15', '14:45')).toBe('2026-03-15T14:45:00.000Z');
    });

    it('defaults the date to today when only time is provided and allowed', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-11T06:00:00.000Z'));

        expect(buildScheduledIso('', '08:00', { defaultDateToToday: true })).toBe('2026-03-11T08:00:00.000Z');

        vi.useRealTimers();
    });

    it('returns null for invalid inputs', () => {
        expect(buildScheduledIso('not-a-date', '09:00')).toBeNull();
        expect(buildScheduledIso('2026-03-11', 'bad')).toBeNull();
        expect(buildScheduledIso('', '', { defaultDateToToday: true })).toBeNull();
    });
});
