"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { KanbanBoard } from '@/components/planner/KanbanBoard';
import { TaskList } from '@/components/planner/TaskList';
import { TimetableView } from '@/components/planner/TimetableView';
import { TimelineView } from '@/components/planner/TimelineView';
import { useGetCategoriesQuery, useGetTasksQuery, useLocalDbHydration, useLocalTasks, useAppSelector, selectCurrentUser, selectAuthStatus } from '@repo/store';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from '@/components/SearchBar';
import { useHighlightedTaskScroll, useTaskQuerySyncFromUrl } from '@/hooks/useTasksPageRouting';
import { mergeTaskSources } from '@/lib/mergeTasks';
import { getApiErrorMessage, getApiErrorReportStatus } from '@/lib/api-error';
import { reportApiError } from '@/lib/errorReporter';
import { ArrowUpDown, AlertTriangle, RefreshCcw } from 'lucide-react';

export function TasksClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Auth guard — redirect to login when session expires rather than flashing the board
    const authStatus = useAppSelector(selectAuthStatus);
    const currentUser = useAppSelector(selectCurrentUser);
    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.replace('/login');
        }
    }, [authStatus, router]);

    const highlightedTaskId = searchParams.get('taskId') || '';
    const [focusedTaskId, setFocusedTaskId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [priority, setPriority] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sort, setSort] = useState<'default' | 'quickWins'>('default');
    const [view, setView] = useState<'kanban' | 'list' | 'timetable' | 'timeline'>('kanban');

    const localHydrated = useLocalDbHydration();
    const {
        data: categories,
        error: categoriesError,
        isError: isCategoriesError,
        refetch: refetchCategories,
    } = useGetCategoriesQuery();
    const allTasksQueryArgs = useMemo(() => ({ page: 1, limit: 100 }), []);
    const {
        data: allTasks,
        isLoading,
        error: tasksError,
        isError: isTasksError,
        refetch: refetchTasks,
    } = useGetTasksQuery(allTasksQueryArgs);
    const { tasks: cachedTasks } = useLocalTasks();

    const tasks = useMemo(
        () => mergeTaskSources(allTasks ?? [], cachedTasks ?? []),
        [allTasks, cachedTasks]
    );
    const hasCachedTaskFallback = cachedTasks.length > 0;
    const shouldShowRemoteFailureFallback = isTasksError && tasks.length === 0 && !isLoading;
    const shouldShowDegradedBanner = (isTasksError && hasCachedTaskFallback) || (isCategoriesError && !categories?.length);

    useEffect(() => {
        if (tasksError) {
            reportApiError(getApiErrorReportStatus(tasksError), 'getTasks', tasksError);
        }
    }, [tasksError]);

    useEffect(() => {
        if (categoriesError) {
            reportApiError(getApiErrorReportStatus(categoriesError), 'getCategories', categoriesError);
        }
    }, [categoriesError]);

    // Persist selected view to URL so navigation preserves it
    const isFirstViewRender = useRef(true);
    useEffect(() => {
        if (isFirstViewRender.current) {
            isFirstViewRender.current = false;
            return;
        }
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', view);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false } as Parameters<typeof router.replace>[1]);
        // pathname, router, and searchParams are stable Next.js references that
        // do not change between renders. Including them in deps would cause this
        // effect to fire on every navigation. The only real dep is `view`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    useTaskQuerySyncFromUrl({
        searchParams,
        categories,
        setSelectedCategory,
        setStatus,
        setFocusedTaskId,
        setView,
    });

    useHighlightedTaskScroll({
        focusedTaskId,
        highlightedTaskId,
        view,
        tasksLength: tasks.length,
        pathname,
        router,
        searchParams,
    });

    const categoryOptions = useMemo(
        () => [
            { label: 'Category', value: 'all', color: '#6B7280' },
            ...(categories || []).map((category) => ({
                label: category.name,
                value: String(category.id),
                color: category.colorCode,
            })),
        ],
        [categories]
    );
    // All hooks called above — safe to short-circuit now
    if (authStatus === 'unauthenticated' || (!currentUser && authStatus !== 'idle' && authStatus !== 'loading')) {
        return null;
    }

    if (isLoading && tasks.length === 0 && !localHydrated) {
        return (
            <div className="space-y-8">
                <Skeleton className="h-10 w-1/3 bg-white/5" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-8 w-32 bg-white/5" />
                            <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
                            <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (shouldShowRemoteFailureFallback) {
        return (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-white backdrop-blur-xl">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-red-400/30 bg-red-500/20 p-2">
                        <AlertTriangle className="h-5 w-5 text-red-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold">Tasks are temporarily unavailable</h2>
                        <p className="mt-2 text-sm text-slate-200">
                            {getApiErrorMessage(tasksError, 'Unable to load your tasks right now.')}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                onClick={() => void refetchTasks()}
                                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Retry tasks
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pt-5 md:pt-15 lg:pt-0 ">
            {shouldShowDegradedBanner ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-xl">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                            <p>
                                {isTasksError && hasCachedTaskFallback
                                    ? 'Task sync is temporarily unavailable. Showing your last available task data while the server recovers.'
                                    : 'Task categories are temporarily unavailable. Filtering may be incomplete until the next successful refresh.'}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {isTasksError ? (
                                <button
                                    onClick={() => void refetchTasks()}
                                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                                >
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    Retry sync
                                </button>
                            ) : null}
                            {isCategoriesError ? (
                                <button
                                    onClick={() => void refetchCategories()}
                                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                                >
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    Retry filters
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
                <SearchBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    status={status}
                    setStatus={setStatus}
                    priority={priority}
                    setPriority={setPriority}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    view={view}
                    setView={setView}
                    categoryOptions={categoryOptions}
                />
                

            {view === 'kanban' ? (
                <KanbanBoard
                    searchQuery={searchQuery}
                    status={status}
                    priority={priority}
                    category={selectedCategory}
                    sort={sort}
                    tasks={tasks}
                />
            ) : view === 'list' ? (
                <TaskList
                    searchQuery={searchQuery}
                    status={status}
                    priority={priority}
                    category={selectedCategory}
                    sort={sort}
                    tasks={tasks}
                    highlightedTaskId={focusedTaskId || undefined}
                />
            ) : view === 'timeline' ? (
                <TimelineView
                    searchQuery={searchQuery}
                    status={status}
                    priority={priority}
                    category={selectedCategory}
                    sort={sort}
                    tasks={tasks}
                />
            ) : (
                <TimetableView />
            )}
        </div>
    );
}
