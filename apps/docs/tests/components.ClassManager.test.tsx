import { render, screen, waitFor } from '@testing-library/react';
import { ClassManager } from '@/components/planner/ClassManager';
import { useGetWeeklyScheduleQuery, useGetSubjectsQuery, useGetRotationPatternsQuery } from '@repo/store';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';

// Mock the RTK Query hooks
vi.mock('@repo/store', () => ({
    useGetWeeklyScheduleQuery: vi.fn(),
    useCreateTimetableEntryMutation: () => [vi.fn()],
    useDeleteTimetableEntryMutation: () => [vi.fn()],
    useGetSubjectsQuery: vi.fn(),
    useCreateSubjectMutation: () => [vi.fn()],
    useDeleteSubjectMutation: () => [vi.fn()],
    useGetRotationPatternsQuery: vi.fn(),
}));

vi.mock('@/hooks/useIsMounted', () => ({
    useIsMounted: () => true,
}));

describe('ClassManager', () => {
    beforeEach(() => {
        (useGetSubjectsQuery as Mock).mockReturnValue({ data: [] });
        (useGetRotationPatternsQuery as Mock).mockReturnValue({ data: [] });
    });

    it('displays timetable entries across multiple days of the week', async () => {
        const mockEntries = [
            {
                id: 'entry-1',
                dayOfWeek: 1, // Monday
                startTime: '09:00',
                endTime: '10:00',
                subject: { name: 'Math', color: '#f00' },
                rotation: null
            },
            {
                id: 'entry-2',
                dayOfWeek: 3, // Wednesday
                startTime: '11:00',
                endTime: '12:00',
                subject: { name: 'Science', color: '#0f0' },
                rotation: 'A'
            }
        ];

        (useGetWeeklyScheduleQuery as Mock).mockReturnValue({
            data: { entries: mockEntries }
        });

        render(<ClassManager />);

        // Verify that entries for different days are both visible in the list
        await waitFor(() => {
            expect(screen.getByText('Math')).toBeInTheDocument();
            expect(screen.getByText('Monday')).toBeInTheDocument();

            expect(screen.getByText('Science')).toBeInTheDocument();
            expect(screen.getByText('Wednesday')).toBeInTheDocument();
            expect(screen.getByText('Rotation A')).toBeInTheDocument();
        });
    });
});
