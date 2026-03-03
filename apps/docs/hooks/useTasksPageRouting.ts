'use client';

import { useEffect, useRef } from 'react';
import { TaskStatus } from '@repo/store';

type CategoryOption = { id: string; name: string };
type TaskView = 'kanban' | 'list' | 'timetable' | 'timeline';

const VALID_VIEWS = new Set<string>(['kanban', 'list', 'timetable', 'timeline']);

interface SearchParamsLike {
    get(name: string): string | null;
    toString(): string;
}

interface RouterLike {
    replace(href: string): void;
}

interface UseTaskQuerySyncParams {
    searchParams: SearchParamsLike;
    categories?: CategoryOption[];
    setSelectedCategory: (value: string) => void;
    setStatus: (value: string) => void;
    setFocusedTaskId: (value: string) => void;
    setView: (value: TaskView) => void;
}

/**
 * Syncs URL search params → filter state once on mount.
 * Re-runs only when searchParams changes (navigation), NOT on categories
 * refetch — which previously reset user-chosen filters via the dep array.
 */
export function useTaskQuerySyncFromUrl({
    searchParams,
    categories,
    setSelectedCategory,
    setStatus,
    setFocusedTaskId,
    setView,
}: UseTaskQuerySyncParams) {
    // Use a ref so category name→id resolution retries once categories load,
    // but never reverts a user-chosen filter on subsequent category refetches.
    const categoriesRef = useRef(categories);
    categoriesRef.current = categories;

    useEffect(() => {
        const queryCategoryId = searchParams.get('categoryId');
        const queryCategoryName = searchParams.get('category');
        const queryStatus = searchParams.get('status');
        const queryTaskId = searchParams.get('taskId');

        if (queryCategoryId) {
            setSelectedCategory(String(queryCategoryId));
        } else if (queryCategoryName) {
            const matched = categoriesRef.current?.find(
                (c) => c.name.toLowerCase() === queryCategoryName.toLowerCase()
            );
            setSelectedCategory(matched?.id ? String(matched.id) : queryCategoryName);
        }

        if (
            queryStatus &&
            (queryStatus === TaskStatus.PENDING ||
                queryStatus === TaskStatus.IN_PROGRESS ||
                queryStatus === TaskStatus.COMPLETED ||
                queryStatus === 'all')
        ) {
            setStatus(queryStatus);
        }

        if (queryTaskId) {
            setFocusedTaskId(queryTaskId);
            setView('list');
        } else {
            // No taskId override — restore persisted view from URL
            const queryView = searchParams.get('view');
            if (queryView && VALID_VIEWS.has(queryView)) {
                setView(queryView as TaskView);
            }
        }
    // categories intentionally omitted — reads via ref to avoid reverting user filters
    }, [searchParams, setFocusedTaskId, setSelectedCategory, setStatus, setView]);
}

interface UseHighlightedTaskScrollParams {
    focusedTaskId: string;
    highlightedTaskId: string;
    view: TaskView;
    /** @deprecated — no longer used by the scroll logic; retained for call-site compatibility */
    tasksLength?: number;
    pathname: string;
    router: RouterLike;
    searchParams: SearchParamsLike;
}

export function useHighlightedTaskScroll({
    focusedTaskId,
    highlightedTaskId,
    view,
    pathname,
    router,
    searchParams,
}: UseHighlightedTaskScrollParams) {
    useEffect(() => {
        if (!focusedTaskId || view !== 'list') return;

        const scrollToTarget = () => {
            const element = document.getElementById(`task-card-${focusedTaskId}`);
            if (!element) return;

            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            if (highlightedTaskId) {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('taskId');
                const next = params.toString();
                router.replace(next ? `${pathname}?${next}` : pathname);
            }
        };

        const timeoutId = window.setTimeout(scrollToTarget, 120);
        return () => window.clearTimeout(timeoutId);
    // tasksLength intentionally omitted — scrolling to a focused task should not
    // re-fire every time an unrelated task is added or removed from the list.
    }, [focusedTaskId, highlightedTaskId, pathname, router, searchParams, view]);
}