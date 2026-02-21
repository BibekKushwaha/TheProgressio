import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';

// Mock hooks used by TopStats
vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}));

vi.mock('@repo/store', () => ({
  useGetDailySummaryQuery: () => ({
    data: { stats: { totalMinutes: 60, totalHours: 1, dailyGoalHours: 4 } },
    isLoading: false,
  }),
  // BFF now delivers focus score + breakdown (replaces useGetFocusScoreQuery)
  useGetDashboardSummaryQuery: () => ({
    data: {
      focus: {
        score: 123,
        breakdown: { consistency: 50, intensity: 30, depth: 40 },
        totalSessions: 5,
        totalMinutes: 60,
        activeDays: 3,
        avgHoursPerDay: 1,
      },
      streak: 2,
      activeDates: [],
      leakage: {},
      peak: {},
      generatedAt: new Date().toISOString(),
    },
    isLoading: false,
  }),
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
