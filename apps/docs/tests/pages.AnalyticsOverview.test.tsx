import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refetchSummary = vi.fn();
const refetchDashboard = vi.fn();
const refetchTaskMetrics = vi.fn();
const refetchHabits = vi.fn();
const refetchReviewDashboard = vi.fn();
const refetchWeeklyTrends = vi.fn();
const reportApiErrorMock = vi.fn();

let summaryState: Record<string, unknown>;
let dashboardState: Record<string, unknown>;
let taskMetricsState: Record<string, unknown>;
let habitsState: Record<string, unknown>;
let weeklyReviewState: Record<string, unknown>;
let reviewDashboardState: Record<string, unknown>;
let weeklyTrendsState: Record<string, unknown>;
let gradeEntriesState: Record<string, unknown>;

vi.mock('@repo/store', () => ({
  useGetDailySummaryQuery: () => summaryState,
  useGetDashboardSummaryQuery: (...args: unknown[]) => {
    const params = args[0] as { leakageDays?: number } | undefined;
    return params?.leakageDays && params.leakageDays !== 1 ? reviewDashboardState : dashboardState;
  },
  useGetTaskMetricsQuery: () => taskMetricsState,
  useGetHabitsQuery: () => habitsState,
  useGetWeeklyReviewQuery: () => weeklyReviewState,
  useGetWeeklyTrendsQuery: () => weeklyTrendsState,
  useGetGradeEntriesQuery: () => gradeEntriesState,
}));

vi.mock('@/lib/errorReporter', () => ({
  reportApiError: (...args: unknown[]) => reportApiErrorMock(...args),
}));

vi.mock('@/components/analytics/AnalyticHeader', () => ({
  AnalyticsHeader: () => <div>__AnalyticsHeader__</div>,
}));

vi.mock('@/components/analytics/AnalyticsEmptyState', () => ({
  AnalyticsEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/analytics/FocusTrend', () => ({
  FocusTrends: () => <div>__FocusTrends__</div>,
}));

vi.mock('@/components/analytics/SessionBreakdown', () => ({
  SessionBreakdown: () => <div>__SessionBreakdown__</div>,
}));

vi.mock('@/components/analytics/StatCard', () => ({
  StatCards: () => <div>__StatCards__</div>,
}));

vi.mock('@/components/analytics/MetricCard', () => ({
  MetricGrid: () => <div>__MetricGrid__</div>,
}));

vi.mock('@/components/analytics/WeeklyReviewSection', () => ({
  WeeklyReviewSection: () => <div>__WeeklyReviewSection__</div>,
  WeeklyReviewDetailCards: () => <div>__WeeklyReviewDetailCards__</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>__Skeleton__</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import AnalyticsPage from '../app/(dashboard)/analytics/page';

describe('AnalyticsPage', () => {
  beforeEach(() => {
    reportApiErrorMock.mockReset();
    refetchSummary.mockReset();
    refetchDashboard.mockReset();
    refetchTaskMetrics.mockReset();
    refetchHabits.mockReset();
    refetchReviewDashboard.mockReset();
    refetchWeeklyTrends.mockReset();

    summaryState = {
      data: { stats: { totalHours: 0, totalTasksCompleted: 0, dailyGoalHours: 4 } },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
      refetch: refetchSummary,
    };
    dashboardState = {
      data: { focus: { score: 70, totalMinutes: 0, avgHoursPerDay: 0, breakdown: { consistency: 10, intensity: 10, depth: 10 } } },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
      refetch: refetchDashboard,
    };
    weeklyReviewState = {
      data: {
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-07T23:59:59.000Z',
        examType: 'JEE',
        insights: [],
        priorities: [],
        adjustment: '',
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
    };
    reviewDashboardState = {
      data: { focus: { score: 70, totalMinutes: 0, avgHoursPerDay: 0 }, streak: 0 },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: undefined,
      refetch: refetchReviewDashboard,
    };
    weeklyTrendsState = {
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: refetchWeeklyTrends,
    };
    gradeEntriesState = {
      data: { entries: [] },
    };
    taskMetricsState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 503, data: { message: 'metrics down' } },
      refetch: refetchTaskMetrics,
    };
    habitsState = {
      data: { habits: [] },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: refetchHabits,
    };
  });

  it('shows a partial-data banner instead of the empty state when one query fails', () => {
    render(<AnalyticsPage />);

    expect(screen.getByText(/Some analytics panels are using partial data/i)).toBeTruthy();
    expect(screen.queryByText(/Your analytics will come alive/i)).toBeNull();
    expect(reportApiErrorMock).toHaveBeenCalledWith(503, 'getTaskMetrics', expect.anything());
  });

  it('retries all analytics queries from the degraded-data banner', () => {
    render(<AnalyticsPage />);

    fireEvent.click(screen.getByRole('button', { name: /retry data/i }));

    expect(refetchSummary).toHaveBeenCalledTimes(1);
    expect(refetchDashboard).toHaveBeenCalledTimes(1);
    expect(refetchTaskMetrics).toHaveBeenCalledTimes(1);
    expect(refetchHabits).toHaveBeenCalledTimes(1);
  });
});
