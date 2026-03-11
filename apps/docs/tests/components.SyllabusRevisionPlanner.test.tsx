import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refetchMock = vi.fn();

let categoriesState: { data?: Array<{ id: string; name: string }>; isLoading?: boolean } = {};
type RecommendationResponse = {
  summary: {
    totalTopics: number;
    coverageGapCount: number;
    needsStudyCount: number;
    readyToReviseCount: number;
    completedTopics: number;
  };
  buckets: {
    coverageGap: Array<Record<string, unknown>>;
    needsStudy: Array<Record<string, unknown>>;
    readyToRevise: Array<Record<string, unknown>>;
  };
};
let recommendationsState: {
  data?: RecommendationResponse;
  isLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
} = {};

vi.mock('@repo/store', () => ({
  useGetCategoriesQuery: () => categoriesState,
  useGetSyllabusRevisionRecommendationsQuery: (args: { categoryId: string }, options: { skip: boolean }) => {
    if (options.skip || !args?.categoryId) {
      return { data: undefined, isLoading: false, isError: false, refetch: refetchMock };
    }
    return recommendationsState;
  },
}));

import { SyllabusRevisionPlanner } from '../components/analytics/SyllabusRevisionPlanner';

describe('SyllabusRevisionPlanner', () => {
  beforeEach(() => {
    refetchMock.mockReset();
    categoriesState = {
      data: [{ id: 'category-1', name: 'Physics' }],
      isLoading: false,
    };
    recommendationsState = {
      isLoading: false,
      isError: false,
      refetch: refetchMock,
      data: {
        summary: {
          totalTopics: 3,
          coverageGapCount: 1,
          needsStudyCount: 1,
          readyToReviseCount: 1,
          completedTopics: 1,
        },
        buckets: {
          coverageGap: [
            {
              topicId: 'topic-1',
              chapter: 'Thermodynamics',
              title: 'Heat Engines',
              progressState: 'unlinked',
              recommendationType: 'coverage_gap',
              reasonCode: 'no_linked_tasks',
              linkedTaskCount: 0,
              completedTaskCount: 0,
              reason: 'No task is linked to this topic yet.',
              suggestedAction: 'create_task',
            },
          ],
          needsStudy: [
            {
              topicId: 'topic-2',
              chapter: 'Thermodynamics',
              title: 'Entropy',
              progressState: 'in_progress',
              recommendationType: 'needs_study',
              reasonCode: 'linked_tasks_in_progress',
              linkedTaskCount: 1,
              completedTaskCount: 0,
              reason: 'You already started working on this topic; finish the active study path.',
              suggestedAction: 'view_syllabus',
            },
          ],
          readyToRevise: [],
        },
      },
    };
  });

  it('shows the import prompt when no syllabus categories exist', () => {
    categoriesState = { data: [], isLoading: false };

    render(<SyllabusRevisionPlanner />);

    expect(screen.getByText(/Import a syllabus or create a subject/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Import syllabus/i })).toHaveAttribute('href', '/createtask?mode=syllabus');
  });

  it('shows the empty-state prompt before a subject is selected', () => {
    render(<SyllabusRevisionPlanner />);

    expect(screen.getByText(/Select a subject to generate syllabus-linked revision recommendations/i)).toBeTruthy();
  });

  it('renders recommendation buckets after selecting a subject', () => {
    render(<SyllabusRevisionPlanner />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'category-1' } });

    expect(screen.getAllByText('Coverage Gaps').length).toBeGreaterThan(0);
    expect(screen.getByText('Heat Engines')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Create task/i })).toHaveAttribute(
      'href',
      '/createtask?mode=task&title=Heat+Engines&topicId=topic-1',
    );
    expect(screen.queryByText(/Priority/i)).toBeNull();
  });

  it('uses a non-create primary CTA for in-progress recommendations', () => {
    render(<SyllabusRevisionPlanner />);

    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: 'category-1' } });

    const syllabusLinks = screen.getAllByRole('link', { name: 'View syllabus' });
    expect(syllabusLinks[0]).toHaveAttribute('href', '/syllabus');
    expect(screen.getByText(/This topic already has active study work/i)).toBeTruthy();
  });
});
