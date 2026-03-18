import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const now = new Date('2026-03-18T10:00:00.000Z');
const pushMock = vi.fn();
const markReadMock = vi.fn();
const useGetNudgesQueryMock = vi.fn();
const useMarkNudgeAsReadMutationMock = vi.fn();
const navigateDeepLinkMock = vi.fn();

vi.mock('@repo/store', () => ({
  useGetNudgesQuery: (...args: unknown[]) => useGetNudgesQueryMock(...args),
  useMarkNudgeAsReadMutation: (...args: unknown[]) => useMarkNudgeAsReadMutationMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/components/analytics/RevisionScheduler', () => ({
  RevisionScheduler: () => <div data-testid="revision-scheduler" />,
}));

vi.mock('@/components/analytics/SyllabusRevisionPlanner', () => ({
  SyllabusRevisionPlanner: () => <div data-testid="syllabus-revision-planner" />,
}));

vi.mock('@/components/analytics/SubjectPerformanceSummary', () => ({
  SubjectPerformanceSummary: () => <div data-testid="subject-performance-summary" />,
}));

vi.mock('@/components/notifications/notificationUtils', () => ({
  parseNudgeMetadata: (metadata: unknown) => (metadata && typeof metadata === 'object' ? metadata : {}),
  resolveNudgeDeepLink: (metadata: Record<string, unknown>) => String(metadata.deepLink ?? '/dashboard'),
  navigateDeepLink: (...args: unknown[]) => navigateDeepLinkMock(...args),
  formatScheduledAt: (value: string) => value,
}));

import ExamWarRoomRevisionPage from '../app/(dashboard)/exam-warroom/revision/page';

describe('Exam War Room revision page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    pushMock.mockReset();
    markReadMock.mockReset();
    navigateDeepLinkMock.mockReset();
    useGetNudgesQueryMock.mockReset();
    useMarkNudgeAsReadMutationMock.mockReset();

    useGetNudgesQueryMock.mockReturnValue({
      data: {
        nudges: [
          {
            id: 'jee-1',
            title: 'Revise JEE Physics',
            message: 'Do electrostatics practice',
            isRead: false,
            scheduledAt: '2026-03-18T12:00:00.000Z',
            metadata: {
              dripCampaign: true,
              examTitle: 'JEE Mock',
              deepLink: '/tasks?exam=JEE&taskId=next-jee',
            },
          },
          {
            id: 'jee-2',
            title: 'Revise JEE Physics',
            message: 'Follow-up reminder',
            isRead: true,
            scheduledAt: '2026-03-18T14:00:00.000Z',
            metadata: {
              dripCampaign: true,
              examTitle: 'JEE Mock',
              deepLink: '/tasks?exam=JEE&taskId=later-jee',
            },
          },
          {
            id: 'neet-1',
            title: 'Revise NEET Biology',
            message: 'Biology sprint',
            isRead: false,
            scheduledAt: '2026-03-18T13:00:00.000Z',
            metadata: {
              dripCampaign: true,
              deepLink: '/tasks?exam=NEET&taskId=next-neet',
            },
          },
          {
            id: 'past-1',
            title: 'Old reminder',
            message: 'Expired',
            isRead: false,
            scheduledAt: '2026-03-17T08:00:00.000Z',
            metadata: {
              dripCampaign: true,
              examTitle: 'Past Campaign',
              deepLink: '/tasks?exam=PAST&taskId=past',
            },
          },
        ],
      },
      isLoading: false,
    });
    useMarkNudgeAsReadMutationMock.mockReturnValue([markReadMock, { isLoading: false }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups future revision campaigns deterministically and excludes past items', () => {
    render(<ExamWarRoomRevisionPage />);

    expect(screen.getByText('JEE Mock')).toBeInTheDocument();
    expect(screen.getByText('NEET')).toBeInTheDocument();
    expect(screen.queryByText('Past Campaign')).toBeNull();
    expect(screen.getByText(/Revision Campaign \(2 reminders\)/i)).toBeInTheDocument();
  });

  it('uses the next upcoming reminder deep link for the group open action', () => {
    render(<ExamWarRoomRevisionPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0] as HTMLElement);

    expect(navigateDeepLinkMock).toHaveBeenCalledWith('/tasks?exam=JEE&taskId=next-jee', pushMock);
  });

  it('disables mark-as-read for reminders that are already read and marks unread reminders', () => {
    render(<ExamWarRoomRevisionPage />);

    const readButton = screen.getByRole('button', { name: /Read/i });
    expect(readButton).toBeDisabled();

    fireEvent.click(screen.getAllByRole('button', { name: /Mark/i })[0] as HTMLElement);

    expect(markReadMock).toHaveBeenCalledWith('jee-1');
  });
});
