import { render, screen, waitFor } from '@testing-library/react';
import { TimetableView } from '@/components/planner/TimetableView';
import { useGetDailyScheduleQuery } from '@repo/store';
import { vi, describe, it, expect, Mock } from 'vitest';

vi.mock('@repo/store', () => ({
    useGetDailyScheduleQuery: vi.fn(),
}));

vi.mock('@/hooks/useIsMounted', () => ({
    useIsMounted: () => true,
}));

// Mock inner components that we don't need to test here
vi.mock('@/components/planner/RotationManager', () => ({ RotationManager: () => <div /> }));
vi.mock('@/components/planner/ClassManager', () => ({ ClassManager: () => <div /> }));
vi.mock('@/components/planner/HolidayManager', () => ({ HolidayManager: () => <div /> }));

describe('TimetableView', () => {
    it('renders a distinct error message on query failure, without pushing rotation setup', async () => {
        (useGetDailyScheduleQuery as Mock).mockReturnValue({
            data: undefined,
            isLoading: false,
            error: new Error('Failed to fetch'),
        });

        render(<TimetableView />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load schedule')).toBeInTheDocument();
            // Should not show the setup rotation CTA on a hard error
            expect(screen.queryByText('Setup Rotation Pattern')).not.toBeInTheDocument();
        });
    });

    it('renders empty message and setup CTA on successful empty response', async () => {
        (useGetDailyScheduleQuery as Mock).mockReturnValue({
            data: null, // explicit empty schedule
            isLoading: false,
            error: null,
        });

        render(<TimetableView />);

        await waitFor(() => {
            expect(screen.getByText('No schedule available for today.')).toBeInTheDocument();
            expect(screen.getByText('Setup Rotation Pattern')).toBeInTheDocument(); // The CTA is now available
        });
    });
});
