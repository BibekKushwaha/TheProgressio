"use client"
import { useState } from 'react';
import { Sidebar } from '@/components/planner/Sidebar';
import { TaskHeader } from '@/components/planner/TaskHeader';
import { KanbanBoard } from '@/components/planner/KanbanBoard';
import { TaskList } from '@/components/planner/TaskList';
import { useGetTasksQuery } from '@repo/store';

export default function TasksPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [priority, setPriority] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [view, setView] = useState<'kanban' | 'list'>('kanban');

    const { data: allTasks, isLoading } = useGetTasksQuery();
    const tasks = allTasks || [];

    if (isLoading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white">
            <div className="flex">
                {/* <Sidebar /> */}
                <div className="flex-1 flex flex-col">
                    <TaskHeader
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
                    <main className="flex-1 p-4 md:p-8 overflow-auto">
                        {view === 'kanban' ? (
                            <KanbanBoard
                                searchQuery={searchQuery}
                                status={status}
                                priority={priority}
                                category={selectedCategory}
                                tasks={tasks}
                            />
                        ) : (
                            <TaskList
                                searchQuery={searchQuery}
                                status={status}
                                priority={priority}
                                category={selectedCategory}
                                tasks={tasks}
                            />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}