import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HabitQuickCreate } from '@/components/habit/HabitQuickCreate';
import { Frequency, useCreateHabitMutation, useGetCategoriesQuery, useParseHabitMutation } from '@repo/store';

const parseHabit = vi.fn();
const createHabit = vi.fn();

vi.mock('@repo/store', () => ({
    Frequency: { DAILY: 'DAILY', WEEKLY: 'WEEKLY' },
    useGetCategoriesQuery: vi.fn(),
    useParseHabitMutation: vi.fn(),
    useCreateHabitMutation: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

describe('HabitQuickCreate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useGetCategoriesQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            data: [{ id: 'cat-1', name: 'Chemistry' }],
        });
        (useParseHabitMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
            parseHabit,
            { isLoading: false },
        ]);
        (useCreateHabitMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
            createHabit,
            { isLoading: false },
        ]);
    });

    it('parses a habit draft and creates the habit from the preview', async () => {
        parseHabit.mockReturnValue({
            unwrap: () => Promise.resolve({
                name: 'Revise Chemistry',
                frequency: Frequency.DAILY,
                targetValue: 20,
                unit: 'minutes',
                linkedCategoryName: 'Chemistry',
                scheduleHint: 'night',
                reminderTime: null,
                confidence: 0.92,
            }),
        });
        createHabit.mockReturnValue({
            unwrap: () => Promise.resolve({}),
        });

        render(<HabitQuickCreate />);

        fireEvent.change(screen.getByPlaceholderText('revise chemistry 20 min every day'), {
            target: { value: 'revise chemistry 20 min every day' },
        });
        fireEvent.click(screen.getByText('Preview'));

        await waitFor(() => {
            expect(screen.getByText('Revise Chemistry')).toBeInTheDocument();
            expect(screen.getByText('20 minutes')).toBeInTheDocument();
            expect(screen.getByText('night')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Create Habit'));

        await waitFor(() => {
            expect(createHabit).toHaveBeenCalledWith({
                name: 'Revise Chemistry',
                frequency: Frequency.DAILY,
                targetValue: 20,
                linkedCategoryId: 'cat-1',
                reminderTime: null,
                scheduleHint: 'night',
            });
        });
    });

    it('includes reminderTime when the parser returns an exact time', async () => {
        parseHabit.mockReturnValue({
            unwrap: () => Promise.resolve({
                name: 'Study Dsa',
                frequency: Frequency.DAILY,
                targetValue: 40,
                unit: 'minutes',
                linkedCategoryName: 'Chemistry',
                scheduleHint: null,
                reminderTime: '15:00',
                confidence: 0.9,
            }),
        });
        createHabit.mockReturnValue({
            unwrap: () => Promise.resolve({}),
        });

        render(<HabitQuickCreate />);

        fireEvent.change(screen.getByPlaceholderText('revise chemistry 20 min every day'), {
            target: { value: 'study dsa 40 min everyday 3 pm' },
        });
        fireEvent.click(screen.getByText('Preview'));

        await waitFor(() => {
            expect(screen.getByText('Study Dsa')).toBeInTheDocument();
            expect(screen.getByText('40 minutes')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Create Habit'));

        await waitFor(() => {
            expect(createHabit).toHaveBeenCalledWith({
                name: 'Study Dsa',
                frequency: Frequency.DAILY,
                targetValue: 40,
                linkedCategoryId: 'cat-1',
                reminderTime: '15:00',
                scheduleHint: null,
            });
        });
    });
});
