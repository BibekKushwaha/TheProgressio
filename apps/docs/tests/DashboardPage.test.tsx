import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';

// Mock child widgets so this test validates page wiring without depending on RTK Query.
vi.mock('@/components/dashboard/DashboardLayoutContext', () => ({
  DashboardLayoutProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/dashboard/OnboardingWizard', () => ({
  OnboardingWizard: () => <div>__OnboardingWizard__</div>,
}));
vi.mock('@/components/dashboard/ModifiableDashboard', () => ({
  ModifiableDashboard: () => (
    <div>
      <div>__WelcomeHeader__</div>
      <div>__LiveActivityWidget__</div>
      <div>__TopStats__</div>
      <div>__WeeklyActivity__</div>
      <div>__TodaysTasks__</div>
      <div>__MorningBriefing__</div>
      <div>__QuickActions__</div>
      <div>__NotesWidget__</div>
      <div>__ActivityLedger__</div>
    </div>
  ),
}));
vi.mock('@/components/dashboard/WelcomeHeader', () => ({
  WelcomeHeader: () => <div>__WelcomeHeader__</div>,
}));
vi.mock('@/components/dashboard/TopStats', () => ({
  TopStats: () => <div>__TopStats__</div>,
}));
vi.mock('@/components/dashboard/WeeklyActivity', () => ({
  WeeklyActivity: () => <div>__WeeklyActivity__</div>,
}));
vi.mock('@/components/dashboard/QuickActions', () => ({
  QuickActions: () => <div>__QuickActions__</div>,
}));
vi.mock('@/components/dashboard/TodaysTasks', () => ({
  TodaysTasks: () => <div>__TodaysTasks__</div>,
}));
vi.mock('@/components/dashboard/MorningBriefing', () => ({
  MorningBriefing: () => <div>__MorningBriefing__</div>,
}));
vi.mock('@/components/dashboard/LiveActivityWidget', () => ({
  LiveActivityWidget: () => <div>__LiveActivityWidget__</div>,
}));
vi.mock('@/components/dashboard/ActivityLedger', () => ({
  ActivityLedger: () => <div>__ActivityLedger__</div>,
}));
vi.mock('@/components/dashboard/NotesWidget', () => ({
  NotesWidget: () => <div>__NotesWidget__</div>,
}));

import DashboardPage from '../app/(dashboard)/dashboard/page';

describe('Dashboard page', () => {
  it('renders primary dashboard widgets', () => {
    render(<DashboardPage />);

    expect(screen.getByText('__WelcomeHeader__')).toBeTruthy();
    expect(screen.getByText('__LiveActivityWidget__')).toBeTruthy();
    expect(screen.getByText('__TopStats__')).toBeTruthy();
    expect(screen.getByText('__WeeklyActivity__')).toBeTruthy();
    expect(screen.getByText('__TodaysTasks__')).toBeTruthy();
    expect(screen.getAllByText('__MorningBriefing__').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('__QuickActions__')).toBeTruthy();
    expect(screen.getByText('__NotesWidget__')).toBeTruthy();
    expect(screen.getByText('__ActivityLedger__')).toBeTruthy();
  });
});
