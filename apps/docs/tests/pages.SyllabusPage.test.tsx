import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refetchCategories = vi.fn();
const refetchTasks = vi.fn();
const reportApiErrorMock = vi.fn();

let categoriesState: Record<string, unknown>;
let tasksState: Record<string, unknown>;

vi.mock('@repo/store', () => ({
  useGetCategoriesQuery: () => categoriesState,
  useGetTasksQuery: () => tasksState,
}));

vi.mock('@/lib/errorReporter', () => ({
  reportApiError: (...args: unknown[]) => reportApiErrorMock(...args),
}));

vi.mock('../app/(dashboard)/syllabus/_components/TopicSection', () => ({
  TopicSection: () => <div>__TopicSection__</div>,
}));

vi.mock('../app/(dashboard)/syllabus/_components/PrerequisiteSection', () => ({
  PrerequisiteSection: () => <div>__PrerequisiteSection__</div>,
}));
vi.mock('../app/(dashboard)/syllabus/_components/SyllabusProgressSection', () => ({
  SyllabusProgressSection: () => <div>__SyllabusProgressSection__</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

import SubjectLibraryPage from '../app/(dashboard)/subjects/page';

describe('SubjectLibraryPage', () => {
  beforeEach(() => {
    reportApiErrorMock.mockReset();
    refetchCategories.mockReset();
    refetchTasks.mockReset();

    categoriesState = {
      data: [{ id: 'cat-1', name: 'Math' }],
      isLoading: false,
      isError: true,
      error: { status: 503, data: { message: 'categories down' } },
      refetch: refetchCategories,
    };

    tasksState = {
      data: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: refetchTasks,
      isFetching: false,
    };
  });

  it('shows a degraded-data banner when category sync fails but cached categories still exist', () => {
    render(<SubjectLibraryPage />);

    expect(screen.getByText(/Some subject insights are using partial data because/i)).toBeTruthy();
    expect(reportApiErrorMock).toHaveBeenCalledWith(503, 'getCategories', expect.anything());
  });

  it('retries category loading from the degraded-data banner', () => {
    render(<SubjectLibraryPage />);

    fireEvent.click(screen.getByRole('button', { name: /retry data/i }));

    expect(refetchCategories).toHaveBeenCalledTimes(1);
    expect(refetchTasks).toHaveBeenCalledTimes(1);
  });
});
