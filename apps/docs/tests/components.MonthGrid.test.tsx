import { render } from '@testing-library/react';
import { describe, expect, it, Mock, vi } from 'vitest';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { useGetHolidaysQuery, useGetMonthlyEventsQuery } from '@repo/store';

vi.mock('@repo/store', () => ({
    useGetMonthlyEventsQuery: vi.fn(),
    useGetHolidaysQuery: vi.fn(),
}));

describe('MonthGrid', () => {
    it('marks every Sunday as a holiday', () => {
        (useGetMonthlyEventsQuery as Mock).mockReturnValue({ data: {} });
        (useGetHolidaysQuery as Mock).mockReturnValue({ data: { holidays: [] } });

        const { container } = render(
            <MonthGrid selectedDate={2} currentMonth={2} currentYear={2026} onDateSelect={() => undefined} />
        );

        const buttons = container.querySelectorAll('button');
        const firstDayOfMonth = new Date(2026, 2, 1).getDay() === 0 ? 6 : new Date(2026, 2, 1).getDay() - 1;
        const sundayDate = 1;
        const mondayDate = 2;
        const sundayButton = buttons[firstDayOfMonth + sundayDate - 1];
        const mondayButton = buttons[firstDayOfMonth + mondayDate - 1];

        expect(sundayButton?.className).toContain('bg-red-500/10');
        expect(sundayButton?.className).toContain('border-red-500/30');
        expect(mondayButton?.className).not.toContain('bg-red-500/10');
    });
});