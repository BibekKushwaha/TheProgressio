import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimetableImportPanel } from '@/components/planner/TimetableImportPanel';
import {
    useCreateSubjectMutation,
    useCreateTimetableEntryMutation,
    useGetSubjectsQuery,
    usePreviewTimetableImportMutation,
} from '@repo/store';

const previewImport = vi.fn();
const createSubject = vi.fn();
const createTimetableEntry = vi.fn();

vi.mock('@repo/store', () => ({
    useGetSubjectsQuery: vi.fn(),
    usePreviewTimetableImportMutation: vi.fn(),
    useCreateSubjectMutation: vi.fn(),
    useCreateTimetableEntryMutation: vi.fn(),
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}));

describe('TimetableImportPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useGetSubjectsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            data: [{ id: 'sub-1', name: 'Math', color: '#3B82F6' }],
        });
        (usePreviewTimetableImportMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
            previewImport,
            { isLoading: false },
        ]);
        (useCreateSubjectMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
            createSubject,
        ]);
        (useCreateTimetableEntryMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
            createTimetableEntry,
        ]);
    });

    it('renders preview rows from pasted text and imports them', async () => {
        previewImport.mockReturnValue({
            unwrap: () => Promise.resolve({
                entries: [
                    {
                        subjectName: 'Math',
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '10:00',
                        rotation: null,
                        confidence: 0.9,
                    },
                    {
                        subjectName: 'Physics',
                        dayOfWeek: 3,
                        startTime: '11:00',
                        endTime: '12:00',
                        rotation: 'A',
                        confidence: 0.82,
                    },
                ],
                warnings: [],
                detectedSubjects: [],
                parser: { deterministicMatches: 2, aiMatches: 0, normalizedLines: 0 },
            }),
        });
        createSubject.mockReturnValue({
            unwrap: () => Promise.resolve({ id: 'sub-2', name: 'Physics', color: '#14B8A6' }),
        });
        createTimetableEntry.mockReturnValue({
            unwrap: () => Promise.resolve({}),
        });

        render(<TimetableImportPanel />);

        fireEvent.change(screen.getByPlaceholderText(/Monday 09:00-10:00 Math A/i), {
            target: { value: 'Monday 09:00-10:00 Math\nWednesday 11:00-12:00 Physics A' },
        });
        fireEvent.click(screen.getByText('Preview Text'));

        await waitFor(() => {
            expect(screen.getByDisplayValue('Math')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Physics')).toBeInTheDocument();
            expect(screen.getByText(/2 rows detected/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Confirm Import'));

        await waitFor(() => {
            expect(createTimetableEntry).toHaveBeenCalledTimes(2);
        });

        expect(createSubject).toHaveBeenCalledWith({
            name: 'Physics',
            color: expect.any(String),
        });
    });

    it('requires explicit subject resolution for ambiguous matches before import', async () => {
        (useGetSubjectsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            data: [
                { id: 'sub-1', name: 'Math', color: '#3B82F6' },
                { id: 'sub-2', name: 'Mathematics', color: '#14B8A6' },
            ],
        });
        previewImport.mockReturnValue({
            unwrap: () => Promise.resolve({
                entries: [
                    {
                        subjectName: 'Mths',
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '10:00',
                        rotation: null,
                        confidence: 0.78,
                    },
                ],
                warnings: [],
                detectedSubjects: [],
                parser: { deterministicMatches: 1, aiMatches: 0, normalizedLines: 0 },
            }),
        });

        render(<TimetableImportPanel />);

        fireEvent.change(screen.getByPlaceholderText(/Monday 09:00-10:00 Math A/i), {
            target: { value: 'Mon 09:00-10:00 Mths' },
        });
        fireEvent.click(screen.getByText('Preview Text'));

        await waitFor(() => {
            expect(screen.getByDisplayValue('Mths')).toBeInTheDocument();
        });

        const optionLabels = screen
            .getAllByRole('option')
            .map((option) => option.textContent ?? '');
        expect(optionLabels).toEqual(
            expect.arrayContaining([
                expect.stringContaining('Mathematics'),
                expect.stringContaining('Math'),
            ])
        );

        fireEvent.click(screen.getByText('Confirm Import'));

        await waitFor(() => {
            expect(createTimetableEntry).not.toHaveBeenCalled();
        });
    });

    it('imports resolved rows even when other rows remain unresolved', async () => {
        (useGetSubjectsQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            data: [
                { id: 'sub-1', name: 'Math', color: '#3B82F6' },
                { id: 'sub-2', name: 'Mathematics', color: '#14B8A6' },
            ],
        });
        previewImport.mockReturnValue({
            unwrap: () => Promise.resolve({
                entries: [
                    {
                        subjectName: 'Math',
                        dayOfWeek: 1,
                        startTime: '09:00',
                        endTime: '10:00',
                        rotation: null,
                        confidence: 0.92,
                    },
                    {
                        subjectName: 'Mths',
                        dayOfWeek: 2,
                        startTime: '11:00',
                        endTime: '12:00',
                        rotation: null,
                        confidence: 0.74,
                    },
                ],
                warnings: [],
                detectedSubjects: [],
                parser: { deterministicMatches: 2, aiMatches: 0, normalizedLines: 0 },
            }),
        });
        createTimetableEntry.mockReturnValue({
            unwrap: () => Promise.resolve({}),
        });

        render(<TimetableImportPanel />);

        fireEvent.change(screen.getByPlaceholderText(/Monday 09:00-10:00 Math A/i), {
            target: { value: 'Mon 09:00-10:00 Math\nTue 11:00-12:00 Mths' },
        });
        fireEvent.click(screen.getByText('Preview Text'));

        await waitFor(() => {
            expect(screen.getByDisplayValue('Math')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Mths')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Confirm Import'));

        await waitFor(() => {
            expect(createTimetableEntry).toHaveBeenCalledTimes(1);
        });
    });
});
