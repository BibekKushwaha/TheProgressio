'use client';

import { useEffect } from 'react';
import { TaskStatus } from '@repo/store';

type CategoryOption = { id: string; name: string };
type TaskView = 'kanban' | 'list' | 'timetable' | 'timeline';

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

export function useTaskQuerySyncFromUrl({
    searchParams,
    categories,
    setSelectedCategory,
    setStatus,
    setFocusedTaskId,
    setView,
}: UseTaskQuerySyncParams) {
    useEffect(() => {
        const queryCategoryId = searchParams.get('categoryId');
        const queryCategoryName = searchParams.get('category');
        const queryStatus = searchParams.get('status');
        const queryTaskId = searchParams.get('taskId');

        if (queryCategoryId) {
            setSelectedCategory(String(queryCategoryId));
        } else if (queryCategoryName) {
            const matchedCategory = categories?.find(
                (category) => category.name.toLowerCase() === queryCategoryName.toLowerCase()
            );
            setSelectedCategory(matchedCategory?.id ? String(matchedCategory.id) : queryCategoryName);
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
        }
    }, [searchParams, categories, setFocusedTaskId, setSelectedCategory, setStatus, setView]);
}

interface UseHighlightedTaskScrollParams {
    focusedTaskId: string;
    highlightedTaskId: string;
    view: TaskView;
    tasksLength: number;
    pathname: string;
    router: RouterLike;
    searchParams: SearchParamsLike;
}

export function useHighlightedTaskScroll({
    focusedTaskId,
    highlightedTaskId,
    view,
    tasksLength,
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
    }, [focusedTaskId, highlightedTaskId, pathname, router, searchParams, tasksLength, view]);
}