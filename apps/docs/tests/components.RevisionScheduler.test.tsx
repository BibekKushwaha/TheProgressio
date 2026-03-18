import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refetchMock = vi.fn();
const useGetRevisionScheduleQueryMock = vi.fn();

vi.mock('@repo/store', () => ({
  useGetRevisionScheduleQuery: (...args: unknown[]) => useGetRevisionScheduleQueryMock(...args),
}));

import { RevisionScheduler } from '../components/analytics/RevisionScheduler';

describe('RevisionScheduler', () => {
  beforeEach(() => {
    refetchMock.mockReset();
    useGetRevisionScheduleQueryMock.mockReset();
    const queryStates: Record<string, unknown> = {
      JEE: {
        data: {
          examType: 'JEE',
          overallReadiness: 72,
          schedule: [
            {
              id: 'JEE-1',
              subject: 'Physics',
              chapter: 'Electrostatics',
              type: 'REVISION',
              time: '07:00',
              duration: 45,
              completed: false,
            },
          ],
        },
        isLoading: false,
        isError: false,
        refetch: refetchMock,
      },
      NEET: {
        data: {
          examType: 'NEET',
          overallReadiness: 72,
          schedule: [
            {
              id: 'NEET-1',
              subject: 'Biology',
              chapter: 'Human Physiology',
              type: 'REVISION',
              time: '07:00',
              duration: 45,
              completed: false,
            },
          ],
        },
        isLoading: false,
        isError: false,
        refetch: refetchMock,
      },
      UPSC: {
        data: { examType: 'UPSC', overallReadiness: 72, schedule: [] },
        isLoading: false,
        isError: false,
        refetch: refetchMock,
      },
      CUSTOM: {
        data: { examType: 'CUSTOM', overallReadiness: 72, schedule: [] },
        isLoading: false,
        isError: false,
        refetch: refetchMock,
      },
    };
    useGetRevisionScheduleQueryMock.mockImplementation((examType: string) => queryStates[examType]);
  });

  it('renders the generated-plan disclaimer and refresh CTA', () => {
    render(<RevisionScheduler />);

    expect(screen.getByText(/generated revision plan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh Suggested Schedule/i })).toBeInTheDocument();
  });

  it('calls refetch from the refresh CTA', () => {
    render(<RevisionScheduler />);

    fireEvent.click(screen.getByRole('button', { name: /Refresh Suggested Schedule/i }));

    expect(refetchMock).toHaveBeenCalled();
  });

  it('updates local completion state when a schedule block is toggled', async () => {
    render(<RevisionScheduler />);

    expect(screen.getByText('0/1 blocks completed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Electrostatics/i }));

    await waitFor(() => {
      expect(screen.getByText('1/1 blocks completed')).toBeInTheDocument();
    });
  });

  it('switches the displayed schedule when the exam tab changes', async () => {
    render(<RevisionScheduler />);

    fireEvent.click(screen.getByRole('button', { name: 'NEET' }));

    await waitFor(() => {
      expect(screen.getByText('Human Physiology')).toBeInTheDocument();
    });
  });
});
