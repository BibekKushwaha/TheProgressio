import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { dispatch, useGetDashboardBootstrapQuery, upsertQueryData } = vi.hoisted(() => ({
  dispatch: vi.fn(),
  useGetDashboardBootstrapQuery: vi.fn(() => ({ data: undefined })),
  upsertQueryData: vi.fn((endpointName: string, arg: unknown, value: unknown) => ({
    type: `habitsApi/${endpointName}`,
    payload: { endpointName, arg, value },
  })),
}));

vi.mock('@repo/store', () => ({
  useAppDispatch: () => dispatch,
  useGetDashboardBootstrapQuery,
  habitsApi: {
    util: {
      upsertQueryData,
    },
  },
  Frequency: {
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
  },
}));

vi.mock('@/hooks/useStreamingMemoryProfile', () => ({
  useStreamingMemoryProfile: vi.fn(),
}));

vi.mock('../app/(dashboard)/habits/HabitsClient', () => ({
  HabitsClient: ({ serverHabits }: { serverHabits?: Array<{ name: string }> }) => (
    <div>{serverHabits?.[0]?.name ?? '__no_habits__'}</div>
  ),
}));

vi.mock('@/components/habit/UserLevelCard', () => ({
  UserLevelCard: () => <div>__UserLevelCard__</div>,
}));

vi.mock('@/components/habit/ContributionHeatmap', () => ({
  ContributionHeatmap: () => <div>__ContributionHeatmap__</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div>__Skeleton__</div>,
}));

import { Frequency, type BootstrapCritical, type DashboardBootstrap } from '@repo/store';
import { HabitsDashboardClient } from '../app/(dashboard)/habits/HabitsDashboardClient';

const criticalData: BootstrapCritical = {
  message: 'critical',
  habits: [
    {
      id: 'habit-1',
      name: 'Deep Work',
      frequency: Frequency.DAILY,
      targetValue: 1,
      currentStreak: 4,
      longestStreak: 6,
      lastLogDate: null,
      userId: 'user-1',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      streakStatus: 'active',
    },
  ],
  xp: {
    xp: 120,
    level: 2,
    levelName: 'Starter',
    xpToNextLevel: 30,
    progress: 80,
  },
};

const fullBootstrapData: DashboardBootstrap = {
  message: 'full',
  habits: criticalData.habits,
  xp: criticalData.xp,
  heatmap: [],
  heatmapSummary: {
    totalContributions: 0,
    activeDays: 0,
    totalDays: 30,
    consistencyRate: 0,
  },
  nudges: [],
};

describe('HabitsDashboardClient', () => {
  beforeEach(() => {
    dispatch.mockReset();
    useGetDashboardBootstrapQuery.mockClear();
    upsertQueryData.mockClear();
    useGetDashboardBootstrapQuery.mockReturnValue({ data: undefined });
  });

  it('skips the initial bootstrap fetch when critical server data already exists', async () => {
    await act(async () => {
      render(
        <HabitsDashboardClient
          criticalData={criticalData}
          secondaryPromise={new Promise(() => undefined)}
        />
      );
    });

    expect(screen.getByText('Deep Work')).toBeTruthy();
    expect(useGetDashboardBootstrapQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ skip: true })
    );

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledTimes(2);
    });

    expect(upsertQueryData).toHaveBeenNthCalledWith(
      1,
      'getHabits',
      undefined,
      expect.objectContaining({ message: 'critical' })
    );
    expect(upsertQueryData).toHaveBeenNthCalledWith(
      2,
      'getUserXP',
      undefined,
      expect.objectContaining({ message: 'critical' })
    );
  });

  it('enables the bootstrap subscription after streamed server data has been cached', async () => {
    const secondaryPromise = Promise.resolve(fullBootstrapData);

    await act(async () => {
      render(
        <HabitsDashboardClient
          criticalData={criticalData}
          secondaryPromise={secondaryPromise}
        />
      );
      await secondaryPromise;
    });

    await waitFor(() => {
      expect(useGetDashboardBootstrapQuery).toHaveBeenLastCalledWith(
        undefined,
        expect.objectContaining({ skip: false })
      );
    });

    expect(upsertQueryData).toHaveBeenCalledWith(
      'getDashboardBootstrap',
      undefined,
      expect.objectContaining({ message: 'full' })
    );
    expect(upsertQueryData).toHaveBeenCalledWith(
      'getContributionHeatmap',
      undefined,
      expect.objectContaining({ message: 'full' })
    );
    expect(upsertQueryData).toHaveBeenCalledWith(
      'getNudges',
      undefined,
      expect.objectContaining({ message: 'full' })
    );
  });
});
