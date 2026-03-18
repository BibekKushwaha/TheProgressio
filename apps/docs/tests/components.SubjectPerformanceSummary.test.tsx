import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubjectPerformance } from '@repo/store';

const useGetAllSubjectPerformanceQueryMock = vi.fn();

vi.mock('@repo/store', () => ({
  useGetAllSubjectPerformanceQuery: (...args: unknown[]) => useGetAllSubjectPerformanceQueryMock(...args),
}));

import { SubjectPerformanceSummary } from '../components/analytics/SubjectPerformanceSummary';

describe('SubjectPerformanceSummary', () => {
  beforeEach(() => {
    useGetAllSubjectPerformanceQueryMock.mockReset();
    useGetAllSubjectPerformanceQueryMock.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });
  });

  it('renders an empty state when there is no subject data', () => {
    render(<SubjectPerformanceSummary />);

    expect(screen.getByText(/No subject performance data available yet/i)).toBeInTheDocument();
  });

  it('uses the provided subjects prop and skips the internal query', () => {
    const subjects: SubjectPerformance[] = [
      { subjectName: 'Physics', avgScore: 82.5, entryCount: 4, trend: 'improving' },
    ];

    render(<SubjectPerformanceSummary subjects={subjects} />);

    expect(useGetAllSubjectPerformanceQueryMock).toHaveBeenCalledWith(undefined, { skip: true });
    expect(screen.getByText('Physics')).toBeInTheDocument();
    expect(screen.getByText('82.5%')).toBeInTheDocument();
  });
});
