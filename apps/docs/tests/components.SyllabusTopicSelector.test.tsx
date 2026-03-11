import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTopics = Array.from({ length: 10 }, (_, index) => ({
  id: `topic-${index + 1}`,
  title: `Topic ${index + 1}`,
  chapter: `Unit ${Math.floor(index / 3) + 1}`,
  categoryId: 'category-1',
}));

vi.mock('@repo/store', () => ({
  useGetSyllabusTopicsQuery: () => ({
    data: { topics: mockTopics },
    isLoading: false,
  }),
}));

import { SyllabusTopicSelector } from '../components/createtask/SyllabusTopicSelector';

describe('SyllabusTopicSelector', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  it('keeps a preselected topic visible even when it falls outside the first eight suggestions', () => {
    render(
      <SyllabusTopicSelector
        categoryId="category-1"
        selectedTopicIds={['topic-10']}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Topic 10')).toBeTruthy();
    expect(screen.getByText(/1 topic will be linked on save/i)).toBeTruthy();
    expect(screen.getByText(/View all 10 topics/i)).toBeTruthy();
  });
});
