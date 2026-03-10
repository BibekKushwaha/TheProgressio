import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/time-picker-input', () => ({
    TimePickerInput: ({
        value,
        onChange,
    }: {
        value: string;
        onChange: (value: string) => void;
    }) => (
        <input
            aria-label="time-picker"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

import { ClassEntryForm } from '../components/createtask/ClassEntryForm';

const baseProps = {
    subjects: [{ id: 'subject-1', name: 'Math', color: '#3B82F6' }],
    rotationLabels: ['A', 'B'],
    classDayOfWeek: 1,
    setClassDayOfWeek: vi.fn(),
    classStartTime: '09:00',
    setClassStartTime: vi.fn(),
    classEndTime: '10:00',
    setClassEndTime: vi.fn(),
    classRotation: '',
    setClassRotation: vi.fn(),
    classSubjectId: '',
    setClassSubjectId: vi.fn(),
    showInlineSubjectCreate: false,
    setShowInlineSubjectCreate: vi.fn(),
    newClassSubjectName: '',
    setNewClassSubjectName: vi.fn(),
    newClassSubjectColor: '#3B82F6',
    setNewClassSubjectColor: vi.fn(),
    newClassSubjectRoom: '',
    setNewClassSubjectRoom: vi.fn(),
    newClassSubjectTeacher: '',
    setNewClassSubjectTeacher: vi.fn(),
    validationErrors: {},
};

describe('ClassEntryForm', () => {
    it('renders class scheduling controls', () => {
        render(<ClassEntryForm {...baseProps} />);

        expect(screen.getByText('Class Details')).toBeTruthy();
        expect(screen.getByText('Create new subject instead')).toBeTruthy();
        expect(screen.getByDisplayValue('09:00')).toBeTruthy();
        expect(screen.getByDisplayValue('10:00')).toBeTruthy();
    });

    it('shows inline subject fields when enabled', () => {
        render(<ClassEntryForm {...baseProps} showInlineSubjectCreate={true} />);

        expect(screen.getByPlaceholderText('e.g. Mathematics')).toBeTruthy();
        expect(screen.getByPlaceholderText('e.g. Hall A2')).toBeTruthy();
        expect(screen.getByPlaceholderText('e.g. Dr. Smith')).toBeTruthy();
    });

    it('auto shows empty-state message when there are no subjects', () => {
        render(<ClassEntryForm {...baseProps} subjects={[]} />);

        expect(screen.getByText('No subjects available')).toBeTruthy();
        expect(screen.getByText('Create a subject below to schedule your first class.')).toBeTruthy();
    });

    it('displays validation messages', () => {
        render(
            <ClassEntryForm
                {...baseProps}
                validationErrors={{
                    classSubject: 'Please select a subject',
                    classTimeRange: 'End time must be after start time',
                }}
            />
        );

        expect(screen.getByText('Please select a subject')).toBeTruthy();
        expect(screen.getByText('End time must be after start time')).toBeTruthy();
    });

    it('calls the inline subject toggle handler', () => {
        render(<ClassEntryForm {...baseProps} />);

        fireEvent.click(screen.getByText('Create new subject instead'));

        expect(baseProps.setShowInlineSubjectCreate).toHaveBeenCalledWith(true);
    });
});
