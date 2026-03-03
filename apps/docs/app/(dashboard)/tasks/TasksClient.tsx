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
    const [view, setView] = useState<'kanban' | 'list' | 'timetable' | 'timeline'>('kanban');

    const localHydrated = useLocalDbHydration();
    const { data: categories } = useGetCategoriesQuery();
    const allTasksQueryArgs = useMemo(() => ({ page: 1, limit: 100 }), []);
    const { data: allTasks, isLoading } = useGetTasksQuery(allTasksQueryArgs);
    const { tasks: cachedTasks } = useLocalTasks();

    const tasks = useMemo(
        () => mergeTaskSources(allTasks ?? [], cachedTasks ?? []),
        [allTasks, cachedTasks]
    );

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

    return (
        <div className="space-y-4 pt-5 md:pt-15 lg:pt-0 ">
            <div className='flex'>
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
            </div>
            {view === 'kanban' ? (
                <KanbanBoard
                    searchQuery={searchQuery}
                    status={status}
                    priority={priority}
                    category={selectedCategory}
                    tasks={tasks}
                />
            ) : view === 'list' ? (
                <TaskList
                    searchQuery={searchQuery}
                    status={status}
                    priority={priority}
                    category={selectedCategory}
                    tasks={tasks}
                    highlightedTaskId={focusedTaskId || undefined}
                />
            ) : view === 'timeline' ? (
                <TimelineView
                    searchQuery={searchQuery}
                    status={status}
                    priority={priority}
                    category={selectedCategory}
                    tasks={tasks}
                />
            ) : (
                <TimetableView />
            )}
        </div>
    );
}
