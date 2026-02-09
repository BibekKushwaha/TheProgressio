"use client"
import { useState } from 'react';
import { KanbanBoard } from '@/components/planner/KanbanBoard';
import { TaskList } from '@/components/planner/TaskList';
import { TimetableView } from '@/components/planner/TimetableView';
import { SubjectCardsSidebar } from '@/components/planner/SubjectCardsSidebar';
import { useGetTasksQuery } from '@repo/store';

import { Skeleton } from '@/components/ui/skeleton';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';

export default function TasksPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [priority, setPriority] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [view, setView] = useState<'kanban' | 'list' | 'timetable'>('kanban');

    const { data: allTasks, isLoading } = useGetTasksQuery();
    const tasks = allTasks || [];

    const handleSidebarCategory = (id: string | undefined) => {
        setSelectedCategory(id || 'all');
    };

    if (isLoading) {
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
                    />
                    <div className="flex flex-1">
                        {/* Subject Cards Sidebar — visible on xl screens */}
                        <aside className="hidden xl:block w-64 shrink-0 p-4 pl-8 pt-0">
                            <div className="sticky top-6">
                                <SubjectCardsSidebar
                                    selectedCategoryId={selectedCategory === 'all' ? undefined : selectedCategory}
                                    onSelectCategory={handleSidebarCategory}
                                />
                            </div>
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