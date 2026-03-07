import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const pushMock = vi.fn();
const dispatchMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
}));

const createNoteMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const createTaskMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'task-1', title: 'First Task' }) });

vi.mock('@repo/store', () => ({
    useAppDispatch: () => dispatchMock,
    useCreateNoteMutation: () => [createNoteMock, { isLoading: false }],
    useCreateTaskMutation: () => [createTaskMock, { isLoading: false }],
    useGetTasksQuery: () => ({ data: [{ id: 't1' }] }),
    addTask: (task: unknown) => ({ type: 'tasks/addTask', payload: task }),
    PriorityEnum: { LOW: 'LOW' },
    TaskStatus: { PENDING: 'PENDING' },
}));

// Stub StartFocusButton so we don't need full planner store
vi.mock('@/components/planner/StartFocusButton', () => ({
    StartFocusButton: () => <button>Start Focus</button>,
}));

import { QuickActions } from '../components/dashboard/QuickActions';

describe('QuickActions', () => {
    beforeEach(() => {
        pushMock.mockClear();
        dispatchMock.mockClear();
        createNoteMock.mockClear();
        createTaskMock.mockClear();
    });

    it('renders Quick Actions heading', () => {
        render(<QuickActions />);
        expect(screen.getByText('Quick Actions')).toBeTruthy();
    });

    it('renders "Add New Task" button', () => {
        render(<QuickActions />);
        expect(screen.getByText('Add New Task')).toBeTruthy();
    });

    it('renders "New Note" button', () => {
        render(<QuickActions />);
        expect(screen.getByText('New Note')).toBeTruthy();
    });

    it('navigates to /createtask when "Add New Task" is clicked', () => {
        render(<QuickActions />);
        fireEvent.click(screen.getByText('Add New Task'));
        expect(pushMock).toHaveBeenCalledWith('/createtask');
    });

    it('opens the note dialog when "New Note" is clicked', async () => {
        render(<QuickActions />);
        fireEvent.click(screen.getByText('New Note'));
        await waitFor(() => {
            expect(screen.getByText('Quick Note')).toBeTruthy();
        });
    });

    it('calls createNote when note is saved', async () => {
        render(<QuickActions />);
        fireEvent.click(screen.getByText('New Note'));

        await waitFor(() => screen.getByText('Quick Note'));

        // Type in the textarea (it has no label → query by role)
        const textarea = document.querySelector('textarea')!;
        fireEvent.change(textarea, { target: { value: 'hello world' } });

        // Click Save
        fireEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(createNoteMock).toHaveBeenCalledWith({ content: 'hello world' });
        });
    });

    it('does not call createNote when textarea is empty', async () => {
        render(<QuickActions />);
        fireEvent.click(screen.getByText('New Note'));

        await waitFor(() => screen.getByText('Quick Note'));

        fireEvent.click(screen.getByRole('button', { name: /save/i }));

        await waitFor(() => {
            expect(createNoteMock).not.toHaveBeenCalled();
        });
    });

    it('renders the StartFocusButton', () => {
        render(<QuickActions />);
        expect(screen.getByText('Start Focus')).toBeTruthy();
    });
});
