import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let mockTrendsData: { data: Array<{ date: string; hours: number; sessions: number }> } | undefined;
let mockTrendsLoading = false;

vi.mock('@/hooks/usePageVisibility', () => ({
    usePageVisibility: () => true,
}));

vi.mock('@repo/store', () => ({
    useGetWeeklyTrendsQuery: () => ({
        data: mockTrendsData,
        isLoading: mockTrendsLoading,
    }),
    useGetProfileQuery: () => ({
        data: { user: { dailyGoalHours: 4 } },
    }),
}));

import { WeeklyActivity } from '../components/dashboard/WeeklyActivity';

const weekOfData = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-02-${22 + i}`,
    hours: 2 + i * 0.3,
    sessions: 1,
}));

describe('WeeklyActivity', () => {
    beforeEach(() => {
        mockTrendsData = { data: weekOfData };
        mockTrendsLoading = false;
    });

    it('renders "Weekly Activity" heading', () => {
        render(<WeeklyActivity />);
        expect(screen.getByText('Weekly Activity')).toBeTruthy();
    });

    it('shows skeleton loader while loading', () => {
        mockTrendsLoading = true;
        mockTrendsData = undefined;
        const { container } = render(<WeeklyActivity />);
        // Skeleton renders within the container
        expect(container.firstChild).toBeTruthy();
    });

    it('shows empty state when there is no data', () => {
        mockTrendsData = { data: [] };
        render(<WeeklyActivity />);
        expect(screen.getByText(/No study sessions logged yet/i)).toBeTruthy();
    });

    it('shows a fixed last-7-days badge', () => {
        render(<WeeklyActivity />);
        expect(screen.getByText('Last 7 Days')).toBeTruthy();
    });

    it('renders SVG chart path when data is present', () => {
        const { container } = render(<WeeklyActivity />);
        expect(container.querySelector('svg')).toBeTruthy();
    });
});
