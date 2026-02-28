import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@repo/store', () => ({
    TaskStatus: {
        PENDING: 'PENDING',
        IN_PROGRESS: 'IN_PROGRESS',
        COMPLETED: 'COMPLETED',
    },
}));

import { useTaskQuerySyncFromUrl } from '../hooks/useTasksPageRouting';

function buildSearchParams(params: Record<string, string>): { get: (k: string) => string | null; toString: () => string } {
    return {
        get: (key: string) => params[key] ?? null,
        toString: () => new URLSearchParams(params).toString(),
    };
}

describe('useTaskQuerySyncFromUrl', () => {
    let setSelectedCategory: ReturnType<typeof vi.fn>;
    let setStatus: ReturnType<typeof vi.fn>;
    let setFocusedTaskId: ReturnType<typeof vi.fn>;
    let setView: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        setSelectedCategory = vi.fn();
        setStatus = vi.fn();
        setFocusedTaskId = vi.fn();
        setView = vi.fn();
    });

    it('sets categoryId from URL when present', () => {
        const searchParams = buildSearchParams({ categoryId: 'cat-001' });
        renderHook(() =>
            useTaskQuerySyncFromUrl({ searchParams, setSelectedCategory, setStatus, setFocusedTaskId, setView })
        );
        expect(setSelectedCategory).toHaveBeenCalledWith('cat-001');
    });

    it('resolves category by name when categoryId is absent', () => {
        const searchParams = buildSearchParams({ category: 'Math' });
        const categories = [{ id: 'id-math', name: 'Math' }];
        renderHook(() =>
            useTaskQuerySyncFromUrl({ searchParams, categories, setSelectedCategory, setStatus, setFocusedTaskId, setView })
        );
        expect(setSelectedCategory).toHaveBeenCalledWith('id-math');
    });

    it('falls back to category name string when category not found in list', () => {
        const searchParams = buildSearchParams({ category: 'Physics' });
        const categories = [{ id: 'id-math', name: 'Math' }];
        renderHook(() =>
            useTaskQuerySyncFromUrl({ searchParams, categories, setSelectedCategory, setStatus, setFocusedTaskId, setView })
        );
        expect(setSelectedCategory).toHaveBeenCalledWith('Physics');
    });

    it('sets status when a valid status is in URL', () => {
        const searchParams = buildSearchParams({ status: 'COMPLETED' });
        renderHook(() =>
            useTaskQuerySyncFromUrl({ searchParams, setSelectedCategory, setStatus, setFocusedTaskId, setView })
        );
        expect(setStatus).toHaveBeenCalledWith('COMPLETED');
    });

    it('sets status to "all" when present in URL', () => {
        const searchParams = buildSearchParams({ status: 'all' });
        renderHook(() =>
            useTaskQuerySyncFromUrl({ searchParams, setSelectedCategory, setStatus, setFocusedTaskId, setView })
        );
        expect(setStatus).toHaveBeenCalledWith('all');
    });

    it('does NOT set status for an invalid value', () => {
        const searchParams = buildSearchParams({ status: 'INVALID' });
        renderHook(() =>
            useTaskQuerySyncFromUrl({ searchParams, setSelectedCategory, setStatus, setFocusedTaskId, setView })
        );
        expect(setStatus).not.toHaveBeenCalled();
    });

    it('sets focusedTaskId when taskId is present', () => {
        const searchParams = buildSearchParams({ taskId: 'task-xyz' });
        renderHook(() =>
            useTaskQuerySyncFromUrl({ searchParams, setSelectedCategory, setStatus, setFocusedTaskId, setView })
        );
        expect(setFocusedTaskId).toHaveBeenCalledWith('task-xyz');
    });

    it('does not call setters when params are absent', () => {
        const searchParams = buildSearchParams({});
        renderHook(() =>
            useTaskQuerySyncFromUrl({ searchParams, setSelectedCategory, setStatus, setFocusedTaskId, setView })
        );
        expect(setSelectedCategory).not.toHaveBeenCalled();
        expect(setStatus).not.toHaveBeenCalled();
        expect(setFocusedTaskId).not.toHaveBeenCalled();
    });
});
