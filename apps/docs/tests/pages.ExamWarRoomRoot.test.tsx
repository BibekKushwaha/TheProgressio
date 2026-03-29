import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const now = new Date('2026-03-18T10:00:00.000Z');
const pushMock = vi.fn();
const markReadMock = vi.fn();
const useGetAllSubjectPerformanceQueryMock = vi.fn();
const useGetGradeEntriesQueryMock = vi.fn();
const useGetNudgesQueryMock = vi.fn();
const useMarkNudgeAsReadMutationMock = vi.fn();
const navigateDeepLinkMock = vi.fn();

vi.mock('@repo/store', () => ({
  useGetAllSubjectPerformanceQuery: (...args: unknown[]) => useGetAllSubjectPerformanceQueryMock(...args),
  useGetGradeEntriesQuery: (...args: unknown[]) => useGetGradeEntriesQueryMock(...args),
  useGetNudgesQuery: (...args: unknown[]) => useGetNudgesQueryMock(...args),
  useMarkNudgeAsReadMutation: (...args: unknown[]) => useMarkNudgeAsReadMutationMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock('@/components/analytics/PredictiveScoreCard', () => ({
  PredictiveScoreCard: ({ examType }: { examType?: string }) => <div data-testid="predictive-score-card">{examType}</div>,
}));

vi.mock('@/components/analytics/SWOTAnalysis', () => ({
  SWOTAnalysis: ({ examType, allowExamTypeChange }: { examType?: string; allowExamTypeChange?: boolean }) => (
    <div data-testid="swot-analysis">{`${examType}|${String(allowExamTypeChange)}`}</div>
  ),
}));

vi.mock('@/components/analytics/SubjectPerformanceSummary', () => ({
  SubjectPerformanceSummary: ({ subjects }: { subjects?: Array<{ subjectName: string }> }) => (
    <div data-testid="subject-performance-summary">{subjects?.length ?? 0}</div>
  ),
}));

vi.mock('@/components/analytics/GradeEntryManager', () => ({
  GradeEntryManager: ({ examType }: { examType?: string }) => <div data-testid="grade-entry-manager">{examType}</div>,
}));

vi.mock('@/components/analytics/RevisionScheduler', () => ({
  RevisionScheduler: () => <div data-testid="revision-scheduler" />,
}));

vi.mock('@/components/analytics/SyllabusRevisionPlanner', () => ({
  SyllabusRevisionPlanner: () => <div data-testid="syllabus-revision-planner" />,
}));

vi.mock('@/components/notifications/notificationUtils', () => ({
  parseNudgeMetadata: (metadata: unknown) => (metadata && typeof metadata === 'object' ? metadata : {}),
  resolveNudgeDeepLink: (metadata: Record<string, unknown>) => String(metadata.deepLink ?? '/dashboard'),
  navigateDeepLink: (...args: unknown[]) => navigateDeepLinkMock(...args),
  formatScheduledAt: (value: string) => value,
}));

import ExamWarRoomPage from '../app/(dashboard)/exam-warroom/page';

describe('Exam War Room merged root page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    pushMock.mockReset();
    markReadMock.mockReset();
    navigateDeepLinkMock.mockReset();
    useGetAllSubjectPerformanceQueryMock.mockReset();
    useGetGradeEntriesQueryMock.mockReset();
    useGetNudgesQueryMock.mockReset();
    useMarkNudgeAsReadMutationMock.mockReset();

    useGetAllSubjectPerformanceQueryMock.mockReturnValue({
      data: {
        data: [
          { subjectName: 'Physics', avgScore: 92, entryCount: 5, trend: 'improving' },
          { subjectName: 'Chemistry', avgScore: 65, entryCount: 3, trend: 'stable' },
          { subjectName: 'Math', avgScore: 45, entryCount: 2, trend: 'declining' },
        ],
      },
      isLoading: false,
    });
    useGetGradeEntriesQueryMock.mockReturnValue({
      data: {
        entries: [{ id: '1', examType: 'NEET' }],
      },
    });
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
        ],
      },
      isLoading: false,
    });
    useMarkNudgeAsReadMutationMock.mockReturnValue([markReadMock, { isLoading: false }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders overview, academic, and revision sections on one page', () => {
    render(<ExamWarRoomPage />);

    expect(screen.getByText('Exam War Room')).toBeInTheDocument();
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Academic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Revision').length).toBeGreaterThan(0);
    expect(screen.getByTestId('grade-entry-manager')).toHaveTextContent('NEET');
    expect(screen.getByTestId('revision-scheduler')).toBeInTheDocument();
    expect(screen.getByTestId('syllabus-revision-planner')).toBeInTheDocument();
  });

  it('reuses one resolved exam type for predictive and SWOT widgets', () => {
    render(<ExamWarRoomPage />);

    expect(screen.getAllByTestId('predictive-score-card')[0]).toHaveTextContent('NEET');
    expect(screen.getByTestId('swot-analysis')).toHaveTextContent('NEET|false');
  });

  it('groups revision campaigns and opens the next upcoming deep link', () => {
    render(<ExamWarRoomPage />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Open' })[0] as HTMLElement);

    expect(screen.getByText('JEE Mock')).toBeInTheDocument();
    expect(navigateDeepLinkMock).toHaveBeenCalledWith('/tasks?exam=JEE&taskId=next-jee', pushMock);
  });
});
