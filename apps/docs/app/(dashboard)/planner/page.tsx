"use client"
import { useEffect, useMemo, useState } from 'react';
import { KanbanBoard } from '@/components/planner/KanbanBoard';
import { TaskList } from '@/components/planner/TaskList';
import { TimetableView } from '@/components/planner/TimetableView';
import { NLPCommandBar } from '@/components/planner/NLPCommandBar';
import { SyllabusDigitizer } from '@/components/planner/SyllabusDigitizer';
import { LocalTask, Task, TaskStatus, useGetCategoriesQuery, useGetTasksQuery, useLocalDbHydration, useLocalTasks } from '@repo/store';
import { useSearchParams } from 'next/navigation';

import { Skeleton } from '@/components/ui/skeleton';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';
import { SubjectCardsSidebar } from '@/components/planner/SubjectCardsSidebar';
import { RecoveryModePanel } from '@/components/planner/RecoveryModePanel';

const toTimestamp = (value: string | Date | null | undefined): number => {
    if (!value) return Number.POSITIVE_INFINITY;
    return new Date(value).getTime();
};

const mergeTaskSources = (remoteTasks: Task[], localTasks: LocalTask[]): Task[] => {
    const merged = new Map<string, Task>();

    remoteTasks.forEach((task) => {
        merged.set(task.id, task);
    });

    localTasks.forEach((localTask) => {
        if (localTask._deletedLocally) {
            merged.delete(localTask.id);
            return;
        }

        if (localTask._dirty || localTask._localOnly || !merged.has(localTask.id)) {
            merged.set(localTask.id, localTask as unknown as Task);
        }
    });

    return Array.from(merged.values()).sort(
        (a, b) => toTimestamp(a.dueDate) - toTimestamp(b.dueDate)
    );
};

export default function TasksPage() {
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [priority, setPriority] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [view, setView] = useState<'kanban' | 'list' | 'timetable'>('kanban');

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
    }, [searchParams, categories]);

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

    const handleViewChange = (nextView: 'kanban' | 'list' | 'timetable') => {
        setView(nextView);
    };


    if (isLoading && tasks.length === 0 && !localHydrated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white p-8 space-y-8">
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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white">
            <div className="flex">
                <div className="flex-1 flex flex-col">
                    <Navbar navLinks={['Overview', 'Calendar', 'Achievements']} buttonText="New Task" />
                    <div className="px-4 md:px-8 pt-4">
                        <NLPCommandBar />
                        <SyllabusDigitizer />
                        <RecoveryModePanel tasks={tasks} />
                    </div>
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
                        setView={handleViewChange}
                        CATEGORY_OPTIONS={categoryOptions}
                    />
                    <div className="flex flex-1">
                        <aside className="hidden xl:block w-72 p-4 md:p-8 pr-0">
                            <SubjectCardsSidebar
                                selectedCategoryId={selectedCategory === 'all' ? undefined : selectedCategory}
                                onSelectCategory={(id) => setSelectedCategory(id || 'all')}
                            />
                        </aside>
                        <main className="flex-1 p-4 md:p-8 overflow-auto">
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
                                />
                            ) : (
                                <TimetableView />
                            )}
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
