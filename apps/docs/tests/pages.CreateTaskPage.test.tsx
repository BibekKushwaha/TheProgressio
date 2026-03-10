import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const setEntryTypeMock = vi.fn();

const baseForm = {
    taskId: null,
    isLoadingTask: false,
    entryType: 'task' as 'task' | 'exam' | 'class',
    setEntryType: setEntryTypeMock,
    taskDescription: 'Task title',
    setTaskDescription: vi.fn(),
    parsedMeta: {},
    matchedCategoryForChip: undefined,
    parseConfidence: 'idle' as const,
    isSmartCreating: false,
    isParsingTask: false,
    validationErrors: {},
    selectedSubjectId: '',
    setSelectedSubjectId: vi.fn(),
    selectedPriority: 'Routine',
    setSelectedPriority: vi.fn(),
    selectedEffort: '1h',
    setSelectedEffort: vi.fn(),
    description: '',
    setDescription: vi.fn(),
    categories: [],
    showManualDetails: true,
    setShowManualDetails: vi.fn(),
    aiSubtaskEnabled: false,
    setAiSubtaskEnabled: vi.fn(),
    isRecurring: false,
    setIsRecurring: vi.fn(),
    subtasks: [],
    setSubtasks: vi.fn(),
    dueDateValue: '',
    dueTimeValue: '',
    updateDueDateTime: vi.fn(),
    handleGenerateSubtasks: vi.fn(),
    examSubMode: 'schedule' as const,
    setExamSubMode: vi.fn(),
    selectedExamSubjectId: '',
    setSelectedExamSubjectId: vi.fn(),
    subjects: [],
    examType: 'Midterm',
    setExamType: vi.fn(),
    obtainedMarks: '',
    setObtainedMarks: vi.fn(),
    totalMarks: '100',
    setTotalMarks: vi.fn(),
    chapter: '',
    setChapter: vi.fn(),
    examLocation: '',
    setExamLocation: vi.fn(),
    examDuration: '120',
    setExamDuration: vi.fn(),
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
    newClassSubjectName: '',
    setNewClassSubjectName: vi.fn(),
    newClassSubjectColor: '#3B82F6',
    setNewClassSubjectColor: vi.fn(),
    newClassSubjectRoom: '',
    setNewClassSubjectRoom: vi.fn(),
    newClassSubjectTeacher: '',
    setNewClassSubjectTeacher: vi.fn(),
    showInlineSubjectCreate: false,
    setShowInlineSubjectCreate: vi.fn(),
    rotationLabels: [],
    parsedDueDate: null,
    hasExplicitDueDate: false,
    existingTask: undefined,
    clearValidationError: vi.fn(),
    useSmartCreate: false,
    setUseSmartCreate: vi.fn(),
    isSubmitting: false,
    handleSaveTask: vi.fn(),
};

let mockForm = baseForm;

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock, replace: pushMock, back: vi.fn() }),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, layoutId, ...props }: React.HTMLAttributes<HTMLDivElement> & { layoutId?: string }) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@repo/store', () => {
    const state = {
        auth: { status: 'authenticated', user: { id: 'user-1' } },
    };

    return {
        selectAuthStatus: (s: typeof state) => s.auth.status,
        selectCurrentUser: (s: typeof state) => s.auth.user,
        useAppSelector: (selector: (s: typeof state) => unknown) => selector(state),
    };
});

vi.mock('@/hooks/useCreateTaskForm', () => ({
    useCreateTaskForm: () => mockForm,
}));

vi.mock('@/components/createtask/TaskInputCard', () => ({
    TaskInputCard: () => <div>__TaskInputCard__</div>,
}));
vi.mock('@/components/createtask/MetaChips', () => ({
    MetaChips: () => <div>__MetaChips__</div>,
}));
vi.mock('@/components/createtask/TaskDetailsForm', () => ({
    TaskDetailsForm: () => <div>__TaskDetailsForm__</div>,
}));
vi.mock('@/components/createtask/ExamEntryForm', () => ({
    ExamEntryForm: () => <div>__ExamEntryForm__</div>,
}));
vi.mock('@/components/createtask/ClassEntryForm', () => ({
    ClassEntryForm: () => <div>__ClassEntryForm__</div>,
}));

import CreateTaskPage from '../app/(dashboard)/createtask/page';

describe('CreateTaskPage', () => {
    beforeEach(() => {
        mockForm = { ...baseForm };
        pushMock.mockClear();
        setEntryTypeMock.mockClear();
    });

    it('renders the class tab in create mode', () => {
        render(<CreateTaskPage />);

        expect(screen.getByText('New Task')).toBeTruthy();
        expect(screen.getByText('Exam Mode')).toBeTruthy();
        expect(screen.getByText('Class')).toBeTruthy();
    });

    it('shows class-specific content and button label in class mode', () => {
        mockForm = { ...baseForm, entryType: 'class' };

        render(<CreateTaskPage />);

        expect(screen.getByText('Class Schedule')).toBeTruthy();
        expect(screen.getByText('__ClassEntryForm__')).toBeTruthy();
        expect(screen.queryByText('__TaskInputCard__')).toBeNull();
        expect(screen.getByRole('button', { name: 'Create Class' })).toBeTruthy();
    });
});
