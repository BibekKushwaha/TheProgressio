import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refetchProfile = vi.fn();
const refetchTasks = vi.fn();
const refetchMetrics = vi.fn();
const refetchHabits = vi.fn();
const refetchSummary = vi.fn();
const reportApiErrorMock = vi.fn();
const composeNotificationMock = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

let profileState: Record<string, unknown>;
let tasksState: Record<string, unknown>;
let metricsState: Record<string, unknown>;
let habitsState: Record<string, unknown>;
let summaryState: Record<string, unknown>;

vi.mock('@repo/store', () => ({
  useGetProfileQuery: () => profileState,
  useGetTasksQuery: () => tasksState,
  useGetTaskMetricsQuery: () => metricsState,
  useGetHabitsQuery: () => habitsState,
  useGetDailySummaryQuery: () => summaryState,
  useComposeNotificationMutation: () => [composeNotificationMock],
}));

vi.mock('@/lib/errorReporter', () => ({
  reportApiError: (...args: unknown[]) => reportApiErrorMock(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      <div>{subtitle}</div>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/stat-card', () => ({
  StatCard: ({ title, description }: { title: string | number; description: string }) => <div>{`${title} ${description}`}</div>,
}));

vi.mock('@/components/family-connect/TaskListItem', () => ({
  TaskListItem: () => <div>__TaskListItem__</div>,
}));

vi.mock('@/components/family-connect/HabitListItem', () => ({
  HabitListItem: () => <div>__HabitListItem__</div>,
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: () => <input />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { FamilyConnectClient } from '../app/(dashboard)/family-connect/FamilyConnectClient';

describe('FamilyConnectClient', () => {
  beforeEach(() => {
    reportApiErrorMock.mockReset();
    refetchProfile.mockReset();
    refetchTasks.mockReset();
    refetchMetrics.mockReset();
    refetchHabits.mockReset();
    refetchSummary.mockReset();

    profileState = {
      data: { user: { username: 'Student' } },
      isError: false,
      error: undefined,
      refetch: refetchProfile,
    };
    tasksState = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 503, data: { message: 'tasks down' } },
      refetch: refetchTasks,
    };
    metricsState = {
      data: { completed: 3, total: 5 },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: refetchMetrics,
    };
    habitsState = {
      data: { habits: [] },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: refetchHabits,
    };
    summaryState = {
      data: { stats: { totalMinutes: 120, totalTasksCompleted: 3, averageSessionLength: 40, consistencyScore: 80 } },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: refetchSummary,
    };
  });

  it('shows a partial-data banner when one family dashboard query fails', () => {
    render(<FamilyConnectClient />);

    expect(screen.getByText(/Family Connect is using partial data/i)).toBeTruthy();
    expect(screen.getByText(/Upcoming assignments are temporarily unavailable/i)).toBeTruthy();
    expect(reportApiErrorMock).toHaveBeenCalledWith(503, 'getTasks', expect.anything());
  });

  it('retries all family dashboard queries from the degraded-data banner', () => {
    render(<FamilyConnectClient />);

    fireEvent.click(screen.getByRole('button', { name: /retry data/i }));

    expect(refetchProfile).toHaveBeenCalledTimes(1);
    expect(refetchTasks).toHaveBeenCalledTimes(1);
    expect(refetchMetrics).toHaveBeenCalledTimes(1);
    expect(refetchHabits).toHaveBeenCalledTimes(1);
    expect(refetchSummary).toHaveBeenCalledTimes(1);
  });
});