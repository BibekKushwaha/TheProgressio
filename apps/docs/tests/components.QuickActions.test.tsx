import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const dispatchMock = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
}));

const createNoteMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const createTaskMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'task-1', title: 'First Task' }) });
const createExamMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'exam-1' }) });

vi.mock('@repo/store', () => ({
    useAppDispatch: () => dispatchMock,
    useCreateNoteMutation: () => [createNoteMock, { isLoading: false }],
    useCreateTaskMutation: () => [createTaskMock, { isLoading: false }],
    useCreateExamMutation: () => [createExamMock, { isLoading: false }],
    addTask: (task: unknown) => ({ type: 'tasks/addTask', payload: task }),
    PriorityEnum: { LOW: 'LOW' },
    TaskStatus: { PENDING: 'PENDING' },
}));

vi.mock('@/components/planner/StartFocusButton', () => ({
    StartFocusButton: () => <button>Start Focus</button>,
}));

vi.mock('@/components/planner/TimetableManagerDialog', () => ({
    TimetableManagerDialog: ({ trigger }: { trigger: React.ReactNode }) => <div data-testid="timetable-dialog-trigger">{trigger}</div>,
}));

vi.mock('@/components/createtask/CreateTaskDatePicker', () => ({
    CreateTaskDatePicker: ({
        value,
        onChange,
        placeholder = 'Select date',
    }: {
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
    }) => (
        <input
            aria-label={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

vi.mock('@/components/ui/time-picker-input', () => ({
    TimePickerInput: ({
        value,
        onChange,
    }: {
        value: string;
        onChange: (value: string) => void;
    }) => (
        <input
            aria-label="Select time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

import { QuickActions } from '../components/dashboard/QuickActions';

describe('QuickActions', () => {
    beforeEach(() => {
        pushMock.mockClear();
        dispatchMock.mockClear();
        createNoteMock.mockClear();
        createTaskMock.mockClear();
        createExamMock.mockClear();
    });

    it('renders the scheduler tabs and defaults to task mode', () => {
        render(<QuickActions />);

        expect(screen.getByText('Task')).toBeTruthy();
        expect(screen.getByText('Exam')).toBeTruthy();
        expect(screen.getByText('Class')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Schedule Task' })).toBeTruthy();
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

    it('creates a task without dueDate when only a title is entered', async () => {
        render(<QuickActions />);

        fireEvent.change(screen.getByPlaceholderText('e.g. Revise cell biology for 30 minutes'), {
            target: { value: 'Revise biology' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Schedule Task' }));

        await waitFor(() => {
            expect(createTaskMock).toHaveBeenCalledWith({
                title: 'Revise biology',
                status: 'PENDING',
                priority: 'LOW',
                dueDate: undefined,
            });
        });
    });

    it('creates a task with dueDate when date and time are entered', async () => {
        render(<QuickActions />);

        fireEvent.change(screen.getByPlaceholderText('e.g. Revise cell biology for 30 minutes'), {
            target: { value: 'Revise chemistry' },
        });
        fireEvent.change(screen.getByLabelText('Select date'), { target: { value: '2026-03-20' } });
        fireEvent.change(screen.getByLabelText('Select time'), { target: { value: '09:30' } });
        fireEvent.click(screen.getByRole('button', { name: 'Schedule Task' }));

        await waitFor(() => {
            const call = createTaskMock.mock.calls[0]?.[0];
            expect(call.title).toBe('Revise chemistry');
            expect(call.dueDate).toBe('2026-03-20T09:30:00.000Z');
        });
    });

    it('routes to the full task editor with prefilled values', () => {
        render(<QuickActions />);

        fireEvent.change(screen.getByPlaceholderText('e.g. Revise cell biology for 30 minutes'), {
            target: { value: 'Revise maths' },
        });
        fireEvent.change(screen.getByLabelText('Select date'), { target: { value: '2026-03-21' } });
        fireEvent.change(screen.getByLabelText('Select time'), { target: { value: '07:15' } });
        fireEvent.click(screen.getByRole('button', { name: 'Open full editor instead' }));

        expect(pushMock).toHaveBeenCalledWith('/createtask?mode=task&title=Revise+maths&date=2026-03-21&time=07%3A15');
    });

    it('creates an exam with the expected payload', async () => {
        render(<QuickActions />);

        fireEvent.click(screen.getByRole('button', { name: 'Exam' }));
        fireEvent.change(screen.getByPlaceholderText('e.g. Physics midterm'), {
            target: { value: 'Physics midterm' },
        });
        fireEvent.change(screen.getByLabelText('Select exam date'), { target: { value: '2026-04-02' } });
        fireEvent.change(screen.getByLabelText('Select time'), { target: { value: '10:45' } });
        fireEvent.change(screen.getByPlaceholderText('Location (optional)'), {
            target: { value: 'Hall A' },
        });
        fireEvent.change(screen.getByPlaceholderText('Duration (mins)'), {
            target: { value: '180' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Schedule Exam' }));

        await waitFor(() => {
            expect(createExamMock).toHaveBeenCalledWith({
                title: 'Physics midterm',
                date: '2026-04-02T10:45:00.000Z',
                durationMinutes: 180,
                location: 'Hall A',
                subjectName: 'Physics midterm',
                priority: 'HIGH',
            });
        });
    });

    it('routes to the full exam editor with prefilled values', () => {
        render(<QuickActions />);

        fireEvent.click(screen.getByRole('button', { name: 'Exam' }));
        fireEvent.change(screen.getByPlaceholderText('e.g. Physics midterm'), {
            target: { value: 'Chemistry final' },
        });
        fireEvent.change(screen.getByLabelText('Select exam date'), { target: { value: '2026-05-01' } });
        fireEvent.change(screen.getByLabelText('Select time'), { target: { value: '08:00' } });
        fireEvent.change(screen.getByPlaceholderText('Location (optional)'), {
            target: { value: 'Block B' },
        });
        fireEvent.change(screen.getByPlaceholderText('Duration (mins)'), {
            target: { value: '150' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Open full editor instead' }));

        expect(pushMock).toHaveBeenCalledWith('/createtask?mode=exam&title=Chemistry+final&date=2026-05-01&time=08%3A00&location=Block+B&duration=150');
    });

    it('renders the timetable manager action in class mode', () => {
        render(<QuickActions />);

        fireEvent.click(screen.getByRole('button', { name: 'Class' }));

        expect(screen.getByText('Open Timetable Manager')).toBeTruthy();
        expect(screen.getByTestId('timetable-dialog-trigger')).toBeTruthy();
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

        const textarea = document.querySelector('textarea')!;
        fireEvent.change(textarea, { target: { value: 'hello world' } });
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
