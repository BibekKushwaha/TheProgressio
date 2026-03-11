import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let searchParams = new URLSearchParams();

const pushMock = vi.fn();
const dispatchMock = vi.fn();
const smartCreateMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const previewSubtasksMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ subtasks: [] }) });
const createTaskMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const createSubTaskMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const updateTaskMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const parseTaskMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve(null) });
const createCategoryMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'category-1' }) });
const addGradeEntryMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const createExamMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
const createSubjectMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'subject-new', name: 'Physics', color: '#3B82F6' }) });
const createTimetableEntryMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'entry-1' }) });
const setTaskSyllabusTopicsMock = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ links: [] }) });
const mockAllSyllabusTopics = [{ id: 'topic-1', title: 'Thermodynamics', chapter: 'Unit 3', categoryId: 'category-1' }];

const mockSubjects = [{ id: 'subject-1', name: 'Math', color: '#3B82F6' }];
const mockPatterns = [{ id: 'rotation-1', name: 'Main', pattern: ['A', 'B'], startDate: '2026-01-01', cycleLengthDays: 2, userId: 'u1', isActive: true, createdAt: '', updatedAt: '' }];

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: pushMock }),
    useSearchParams: () => ({
        get: (key: string) => searchParams.get(key),
    }),
}));

vi.mock('@repo/store', () => ({
    useSmartCreateTaskMutation: () => [smartCreateMock, { isLoading: false }],
    usePreviewSubtasksMutation: () => [previewSubtasksMock],
    useCreateTaskMutation: () => [createTaskMock, { isLoading: false }],
    useCreateSubTaskMutation: () => [createSubTaskMock],
    useUpdateTaskMutation: () => [updateTaskMock, { isLoading: false }],
    useGetTaskByIdQuery: () => ({ data: undefined, isLoading: false }),
    useParseTaskMutation: () => [parseTaskMock, { isLoading: false }],
    PriorityEnum: { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' },
    TaskStatus: { PENDING: 'PENDING' },
    addTask: (task: unknown) => task,
    useGetCategoriesQuery: () => ({ data: [] }),
    useCreateCategoryMutation: () => [createCategoryMock],
    useAddGradeEntryMutation: () => [addGradeEntryMock, { isLoading: false }],
    useCreateExamMutation: () => [createExamMock, { isLoading: false }],
    useGetSubjectsQuery: () => ({ data: mockSubjects }),
    useCreateSubjectMutation: () => [createSubjectMock],
    useGetRotationPatternsQuery: () => ({ data: mockPatterns }),
    useCreateTimetableEntryMutation: () => [createTimetableEntryMock, { isLoading: false }],
    useGetTaskSyllabusTopicsQuery: () => ({ data: { links: [] } }),
    useGetSyllabusTopicsQuery: () => ({ data: { topics: mockAllSyllabusTopics } }),
    useSetTaskSyllabusTopicsMutation: () => [setTaskSyllabusTopicsMock],
    useAppDispatch: () => dispatchMock,
}));

import { useCreateTaskForm } from '../hooks/useCreateTaskForm';

describe('useCreateTaskForm', () => {
    beforeEach(() => {
        searchParams = new URLSearchParams();
        pushMock.mockClear();
        dispatchMock.mockClear();
        smartCreateMock.mockClear();
        previewSubtasksMock.mockClear();
        createTaskMock.mockClear();
        createSubTaskMock.mockClear();
        updateTaskMock.mockClear();
        parseTaskMock.mockClear();
        createCategoryMock.mockClear();
        addGradeEntryMock.mockClear();
        createExamMock.mockClear();
        createSubjectMock.mockClear();
        createTimetableEntryMock.mockClear();
        setTaskSyllabusTopicsMock.mockClear();
    });

    it('hydrates task mode title, date, and time from query params', async () => {
        searchParams = new URLSearchParams('mode=task&title=Bio&date=2026-03-21&time=07:45');

        const { result } = renderHook(() => useCreateTaskForm());

        await waitFor(() => {
            expect(result.current.entryType).toBe('task');
            expect(result.current.taskDescription).toBe('Bio');
            expect(result.current.dueDateValue).toBe('2026-03-21');
            expect(result.current.dueTimeValue).toBe('07:45');
            expect(result.current.hasExplicitDueDate).toBe(true);
        });
    });

    it('hydrates exam mode schedule fields from query params', async () => {
        searchParams = new URLSearchParams('mode=exam&title=Chem&date=2026-04-08&time=10:30&location=Hall+A&duration=150');

        const { result } = renderHook(() => useCreateTaskForm());

        await waitFor(() => {
            expect(result.current.entryType).toBe('exam');
            expect(result.current.examSubMode).toBe('schedule');
            expect(result.current.taskDescription).toBe('Chem');
            expect(result.current.dueDateValue).toBe('2026-04-08');
            expect(result.current.dueTimeValue).toBe('10:30');
            expect(result.current.examLocation).toBe('Hall A');
            expect(result.current.examDuration).toBe('150');
        });
    });

    it('opens class mode from query params', async () => {
        searchParams = new URLSearchParams('mode=class');

        const { result } = renderHook(() => useCreateTaskForm());

        await waitFor(() => {
            expect(result.current.entryType).toBe('class');
            expect(result.current.rotationLabels).toEqual(['A', 'B']);
        });
    });

    it('ignores invalid query date/time values', async () => {
        searchParams = new URLSearchParams('mode=task&title=Bio&date=bad&time=oops');

        const { result } = renderHook(() => useCreateTaskForm());

        await waitFor(() => {
            expect(result.current.taskDescription).toBe('Bio');
            expect(result.current.dueDateValue).toBe('');
            expect(result.current.dueTimeValue).toBe('');
            expect(result.current.hasExplicitDueDate).toBe(false);
        });
    });

    it('hydrates a shortcut topic selection from query params', async () => {
        searchParams = new URLSearchParams('mode=task&title=Heat+Engines&topicId=topic-1');

        const { result } = renderHook(() => useCreateTaskForm());

        await waitFor(() => {
            expect(result.current.selectedSubjectId).toBe('category-1');
            expect(result.current.selectedSyllabusTopicIds).toEqual(['topic-1']);
        });
    });

    it('fails validation when class mode has no subject and no inline subject name', async () => {
        const { result } = renderHook(() => useCreateTaskForm());

        act(() => {
            result.current.setEntryType('class');
            result.current.setShowInlineSubjectCreate(true);
            result.current.setNewClassSubjectName('');
        });

        await act(async () => {
            await result.current.handleSaveTask();
        });

        expect(createTimetableEntryMock).not.toHaveBeenCalled();
        expect(result.current.validationErrors.classSubjectName).toBe('Subject name is required');
    });

    it('fails validation when class end time is before start time', async () => {
        const { result } = renderHook(() => useCreateTaskForm());

        act(() => {
            result.current.setEntryType('class');
            result.current.setClassSubjectId('subject-1');
            result.current.setClassStartTime('11:00');
            result.current.setClassEndTime('10:00');
        });

        await act(async () => {
            await result.current.handleSaveTask();
        });

        expect(createTimetableEntryMock).not.toHaveBeenCalled();
        expect(result.current.validationErrors.classTimeRange).toBe('End time must be after start time');
    });

    it('creates a timetable entry with an existing subject', async () => {
        const { result } = renderHook(() => useCreateTaskForm());

        act(() => {
            result.current.setEntryType('class');
            result.current.setClassSubjectId('subject-1');
            result.current.setClassDayOfWeek(2);
            result.current.setClassStartTime('09:15');
            result.current.setClassEndTime('10:45');
            result.current.setClassRotation('A');
        });

        await act(async () => {
            await result.current.handleSaveTask();
        });

        expect(createTimetableEntryMock).toHaveBeenCalledWith({
            dayOfWeek: 2,
            startTime: '09:15',
            endTime: '10:45',
            subjectId: 'subject-1',
            rotation: 'A',
        });
        expect(createSubjectMock).not.toHaveBeenCalled();
        expect(pushMock).toHaveBeenCalledWith('/planner');
    });

    it('creates a subject inline before creating the timetable entry', async () => {
        const { result } = renderHook(() => useCreateTaskForm());

        act(() => {
            result.current.setEntryType('class');
            result.current.setShowInlineSubjectCreate(true);
            result.current.setNewClassSubjectName('Physics');
            result.current.setNewClassSubjectRoom('Lab 2');
            result.current.setNewClassSubjectTeacher('Dr. Rao');
            result.current.setClassDayOfWeek(4);
            result.current.setClassStartTime('13:00');
            result.current.setClassEndTime('14:00');
        });

        await act(async () => {
            await result.current.handleSaveTask();
        });

        expect(createSubjectMock).toHaveBeenCalledWith({
            name: 'Physics',
            color: '#3B82F6',
            room: 'Lab 2',
            teacher: 'Dr. Rao',
        });
        expect(createTimetableEntryMock).toHaveBeenCalledWith({
            dayOfWeek: 4,
            startTime: '13:00',
            endTime: '14:00',
            subjectId: 'subject-new',
            rotation: null,
        });
    });

    it('creates a task atomically with selected syllabus topic ids', async () => {
        const { result } = renderHook(() => useCreateTaskForm());

        act(() => {
            result.current.setTaskDescription('Study Heat Engines');
            result.current.setSelectedSubjectId('category-1');
            result.current.setSelectedSyllabusTopicIds(['topic-1']);
        });

        await act(async () => {
            await result.current.handleSaveTask();
        });

        expect(createTaskMock).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Study Heat Engines',
            categoryId: 'category-1',
            topicIds: ['topic-1'],
        }));
        expect(setTaskSyllabusTopicsMock).not.toHaveBeenCalled();
    });
});
