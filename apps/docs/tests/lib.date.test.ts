import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    toLocalDateKey,
    getTodayDateKey,
    normalizeDateInput,
    formatRelativeDate,
    formatDueDate,
} from '../lib/date';

// ─── toLocalDateKey ───────────────────────────────────────────────────────────
describe('toLocalDateKey', () => {
    it('returns a YYYY-MM-DD string for a valid UTC midnight date', () => {
        // Fix to UTC midnight so timezone offset is predictable
        const d = new Date('2024-06-15T00:00:00.000Z');
        const result = toLocalDateKey(d);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns empty string for an invalid date', () => {
        expect(toLocalDateKey(new Date('not-a-date'))).toBe('');
    });

    it('returns non-empty for a real Date instance', () => {
        expect(toLocalDateKey(new Date())).not.toBe('');
    });
});

// ─── getTodayDateKey ──────────────────────────────────────────────────────────
describe('getTodayDateKey', () => {
    afterEach(() => vi.useRealTimers());

    it('returns a YYYY-MM-DD string for today', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));
        const key = getTodayDateKey();
        expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

// ─── normalizeDateInput ───────────────────────────────────────────────────────
describe('normalizeDateInput', () => {
    it('returns null for empty string', () => {
        expect(normalizeDateInput('')).toBeNull();
        expect(normalizeDateInput('   ')).toBeNull();
    });

    it('passes through a valid ISO date unchanged', () => {
        expect(normalizeDateInput('2026-02-28')).toBe('2026-02-28');
    });

    it('normalizes MM/DD/YYYY where month ≤ 12', () => {
        // 03/15/2026 → unambiguously March 15
        expect(normalizeDateInput('03/15/2026')).toBe('2026-03-15');
    });

    it('normalizes DD/MM/YYYY where day > 12', () => {
        // 25/03/2026 → day=25, month=3
        expect(normalizeDateInput('25/03/2026')).toBe('2026-03-25');
    });

    it('returns null for a non-matching format', () => {
        expect(normalizeDateInput('Feb 28 2026')).toBeNull();
        expect(normalizeDateInput('28-02-2026')).toBeNull();
    });

    it('returns null when month out of range', () => {
        expect(normalizeDateInput('00/15/2026')).toBeNull();
        expect(normalizeDateInput('13/15/2026')).toBeNull();
    });

    it('returns null when day out of range', () => {
        expect(normalizeDateInput('02/00/2026')).toBeNull();
        expect(normalizeDateInput('02/32/2026')).toBeNull();
    });
});

// ─── formatRelativeDate ───────────────────────────────────────────────────────
describe('formatRelativeDate', () => {
    afterEach(() => vi.useRealTimers());

    const fixedNow = new Date('2026-02-28T12:00:00.000Z'); // Saturday

    it('returns "Today" for current date', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);
        expect(formatRelativeDate(new Date('2026-02-28T08:00:00'))).toBe('Today');
    });

    it('returns "Tomorrow" for next day', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);
        expect(formatRelativeDate(new Date('2026-03-01T08:00:00'))).toBe('Tomorrow');
    });

    it('returns "Yesterday" for previous day', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);
        expect(formatRelativeDate(new Date('2026-02-27T08:00:00'))).toBe('Yesterday');
    });

    it('returns empty string for an invalid date', () => {
        expect(formatRelativeDate('not-a-date')).toBe('');
    });

    it('returns a date string for dates ≥ 14 days away', () => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);
        const result = formatRelativeDate(new Date('2026-03-28T08:00:00'));
        expect(result).toContain('Mar');
    });
});

// ─── formatDueDate ────────────────────────────────────────────────────────────
describe('formatDueDate', () => {
    afterEach(() => vi.useRealTimers());

    it('returns "No due date" for null/undefined', () => {
        expect(formatDueDate(null)).toBe('No due date');
        expect(formatDueDate(undefined)).toBe('No due date');
    });

    it('returns "Due today" for today', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));
        expect(formatDueDate('2026-02-28')).toBe('Due today');
    });

    it('returns "Due tomorrow" for tomorrow', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));
        expect(formatDueDate('2026-03-01')).toBe('Due tomorrow');
    });

    it('returns "Nd left" for upcoming dates within a week', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));
        expect(formatDueDate('2026-03-03')).toBe('3d left');
    });

    it('returns "Nd overdue" for past dates', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-28T12:00:00Z'));
        expect(formatDueDate('2026-02-25')).toBe('3d overdue');
    });
});
