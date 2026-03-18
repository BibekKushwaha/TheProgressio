import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useGetAllSubjectPerformanceQueryMock = vi.fn();
const useGetGradeEntriesQueryMock = vi.fn();

vi.mock('@repo/store', () => ({
  useGetAllSubjectPerformanceQuery: (...args: unknown[]) => useGetAllSubjectPerformanceQueryMock(...args),
  useGetGradeEntriesQuery: (...args: unknown[]) => useGetGradeEntriesQueryMock(...args),
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

import ExamWarRoomOverviewPage from '../app/(dashboard)/exam-warroom/overview/page';

describe('Exam War Room overview page', () => {
  beforeEach(() => {
    useGetAllSubjectPerformanceQueryMock.mockReset();
    useGetGradeEntriesQueryMock.mockReset();
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
  });

  it('computes total attempts from entry counts and buckets subjects into the documented tiers', () => {
    render(<ExamWarRoomOverviewPage />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Strong (≥80%)').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Developing (50–79%)').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Needs Work (<50%)').nextElementSibling).toHaveTextContent('1');
  });

  it('passes one resolved exam type into predictive and SWOT widgets', () => {
    render(<ExamWarRoomOverviewPage />);

    expect(screen.getByTestId('predictive-score-card')).toHaveTextContent('NEET');
    expect(screen.getByTestId('swot-analysis')).toHaveTextContent('NEET|false');
  });

  it('falls back to JEE when no grade-entry exam type exists', () => {
    useGetGradeEntriesQueryMock.mockReturnValue({
      data: { entries: [] },
    });

    render(<ExamWarRoomOverviewPage />);

    expect(screen.getByTestId('predictive-score-card')).toHaveTextContent('JEE');
    expect(screen.getByTestId('swot-analysis')).toHaveTextContent('JEE|false');
  });
});
