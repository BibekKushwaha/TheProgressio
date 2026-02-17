import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';

// Mock the store hooks used by TopStats before importing the component
vi.mock('@repo/store', () => ({
  useGetDailySummaryQuery: () => ({ data: { stats: { totalMinutes: 60, totalHours: 1, dailyGoalHours: 4 } }, isLoading: false }),
  useGetFocusScoreQuery: () => ({ data: { stats: { score: 123, breakdown: { consistency: 50, intensity: 30, depth: 40 } } }, isLoading: false }),
  useGetUserStreakQuery: () => ({ data: { streak: 2, activeDates: [] }, isLoading: false }),
  useGetActiveLiveSessionQuery: () => ({ data: null }),
}));

import { TopStats } from '../components/dashboard/TopStats';

describe('TopStats component', () => {
  it('clamps focusScore values >100 down to 100 and shows one decimal', () => {
    render(<TopStats />);
    // focusScore displayed with one decimal
    expect(screen.getByText('100.0')).toBeTruthy();
  });

  it('renders breakdown bars capped at 100% width', () => {
    const { container } = render(<TopStats />) as { container: HTMLElement };
    const consistencyBar = container.querySelector('.bg-indigo-500');
    expect(consistencyBar).toBeTruthy();
    // 50 / 40 -> 125% but capped to 100%
    expect((consistencyBar?.getAttribute('style') || '')).toContain('width: 100%');
  });
});
