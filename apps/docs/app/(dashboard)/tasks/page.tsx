"use client"
import { useEffect, useMemo, useState } from 'react';
import { KanbanBoard } from '@/components/planner/KanbanBoard';
import { TaskList } from '@/components/planner/TaskList';
import { TimetableView } from '@/components/planner/TimetableView';
import { TimelineView } from '@/components/planner/TimelineView';
import { TaskStatus, useGetCategoriesQuery, useGetTasksQuery, useLocalDbHydration, useLocalTasks } from '@repo/store';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { mergeTaskSources } from '@/lib/mergeTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from '@/components/SearchBar';

export default function TasksPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const highlightedTaskId = searchParams.get('taskId') || '';
    const [focusedTaskId, setFocusedTaskId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [priority, setPriority] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [view, setView] = useState<'kanban' | 'list' | 'timetable' | 'timeline'>('kanban');

    const localHydrated = useLocalDbHydration();
    const { data: categories } = useGetCategoriesQuery();
    const { data: allTasks, isLoading } = useGetTasksQuery({ page: 1, limit: 500 });

    const { tasks: cachedTasks } = useLocalTasks();
    const tasks = useMemo(
        () => mergeTaskSources(allTasks || [], cachedTasks),
        [allTasks, cachedTasks]
    );

    useEffect(() => {
        const queryCategoryId = searchParams.get('categoryId');
        const queryCategoryName = searchParams.get('category');
        const queryStatus = searchParams.get('status');
        const queryTaskId = searchParams.get('taskId');

        if (queryCategoryId) {
            setSelectedCategory(queryCategoryId);
        } else if (queryCategoryName) {
            const matchedCategory = categories?.find(
                category => category.name.toLowerCase() === queryCategoryName.toLowerCase()
            );
            setSelectedCategory(matchedCategory?.id || queryCategoryName);
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
    }, [searchParams, categories]);

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
    }, [focusedTaskId, highlightedTaskId, view, tasks.length, pathname, router, searchParams]);

    const categoryOptions = useMemo(
        () => [
            { label: 'Category', value: 'all', color: '#6B7280' },
            ...(categories || []).map((category) => ({
                label: category.name,
                value: category.id,
                color: category.colorCode,
            })),
        ],
        [categories]
    );

    const handleViewChange = (nextView: 'kanban' | 'list' | 'timetable' | 'timeline') => {
        setView(nextView);
    };


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
            <div className='hidden md:flex'>
            <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                priority={priority}
                setPriority={setPriority}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                view={view}
                setView={handleViewChange}
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
