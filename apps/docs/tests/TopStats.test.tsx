import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect, afterEach } from 'vitest';

const mockDashboardSummary = {
  focus: {
    score: 123,
    breakdown: { consistency: 50, intensity: 30, depth: 40 },
    totalSessions: 5,
    totalMinutes: 60,
    activeDays: 3,
    avgHoursPerDay: 1,
  },
  streak: 2,
  activeDates: [] as string[],
  leakage: {},
  peak: {},
  generatedAt: new Date().toISOString(),
};

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
    data: mockDashboardSummary,
    isLoading: false,
  }),
  useGetActiveLiveSessionQuery: () => ({ data: null }),
}));

import { TopStats } from '../components/dashboard/TopStats';

describe('TopStats component', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders daily goal, focus score, performance details, and streak sections', () => {
    mockDashboardSummary.focus.score = 55;
    mockDashboardSummary.streak = 3;
    mockDashboardSummary.activeDates = [];

    render(<TopStats />);

    expect(screen.getByText('Daily Goal')).toBeTruthy();
    expect(screen.getByText('Focus Score')).toBeTruthy();
    // Overlay is in DOM even when not hovered.
    expect(screen.getByText('Performance Details')).toBeTruthy();
    expect(screen.getByText('Active Streak')).toBeTruthy();
  });

  it('clamps focusScore values >100 down to 100 and shows one decimal', () => {
    mockDashboardSummary.focus.score = 123;
    mockDashboardSummary.streak = 2;
    mockDashboardSummary.activeDates = [];
    render(<TopStats />);
    // focusScore displayed with one decimal
    expect(screen.getByText('100.0')).toBeTruthy();
  });

  it('renders breakdown bars capped at 100% width', () => {
    mockDashboardSummary.focus.score = 123;
    mockDashboardSummary.streak = 2;
    mockDashboardSummary.activeDates = [];
    const { container } = render(<TopStats />) as { container: HTMLElement };
    const consistencyBar = container.querySelector('.bg-indigo-500');
    expect(consistencyBar).toBeTruthy();
    // 50 / 40 -> 125% but capped to 100%
    expect((consistencyBar?.getAttribute('style') || '')).toContain('width: 100%');
  });

  it('uses activeDates as a fallback when streak is zero', () => {
    vi.useFakeTimers();
    const fixedNow = new Date('2026-02-28T12:00:00.000Z');
    vi.setSystemTime(fixedNow);
    mockDashboardSummary.focus.score = 36;
    mockDashboardSummary.streak = 0;
    mockDashboardSummary.activeDates = ['2026-02-28', '2026-02-27'];

    render(<TopStats />);

    expect(screen.getByText('2')).toBeTruthy();
  });
});
