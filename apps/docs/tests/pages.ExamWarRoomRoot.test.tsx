import { describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));

import ExamWarRoom from '../app/(dashboard)/exam-warroom/page';

describe('Exam War Room root page', () => {
  it('redirects to the overview page', () => {
    ExamWarRoom();

    expect(redirectMock).toHaveBeenCalledWith('/exam-warroom/overview');
  });
});
