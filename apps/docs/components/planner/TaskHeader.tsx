"use client"
import { Search, Filter, Tag, LayoutGrid, List } from 'lucide-react';
import { useGetTasksQuery, TaskStatus, PriorityEnum } from '@repo/store';
import { useState } from 'react';
import { FilterDropdown } from './FilterDropdown';
import { TaskDialog } from '../TaskDialog';

const STATUS_OPTIONS = [
    { label: "Status", value: "all" },
    { label: "Pending", value: TaskStatus.PENDING },
    { label: "In Progress", value: TaskStatus.IN_PROGRESS },
    { label: "Completed", value: TaskStatus.COMPLETED },
] as const;

const PRIORITY_OPTIONS = [
    { label: "Priority", value: "all" },
    { label: "Low", value: PriorityEnum.LOW },
    { label: "Medium", value: PriorityEnum.MEDIUM },
    { label: "High", value: PriorityEnum.HIGH },
] as const;

const CATEGORY_OPTIONS = [
    { label: "Category", value: "all", color: "#6B7280" },
    { label: "Personal", value: "personal", color: "#A855F7" },
    { label: "Studies", value: "studies", color: "#3B82F6", },
    { label: "Fitness", value: "fitness", color: "#22C55E" },
    { label: "Coding", value: "coding", color: "#F97316" },
] as const;


interface TaskHeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    status: string;
    setStatus: (status: any) => void;
    priority: string;
    setPriority: (priority: any) => void;
    selectedCategory: string;
    setSelectedCategory: (category: any) => void;
    view: 'kanban' | 'list';
    setView: (view: 'kanban' | 'list') => void;
}

export function TaskHeader({
    searchQuery,
    setSearchQuery,
    status,
    setStatus,
    priority,
    setPriority,
    selectedCategory,
    setSelectedCategory,
    view,
    setView
}: TaskHeaderProps) {
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

    const handleOpenTaskDialog = () => {
        setIsTaskDialogOpen(true);
    };
    return (
        <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div className="mb-4 md:mb-0">
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            My Tasks
                        </h1>
                        <p className="text-slate-400">Manage your daily productivity and goals</p>
                    </div>
                    <button
                        onClick={handleOpenTaskDialog}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-0.5">
                        + New Task
                    </button>
                </div>
                {isTaskDialogOpen && <TaskDialog onClose={() => setIsTaskDialogOpen(false)} onSubmit={async () => { }} />}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tasks…"
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <FilterDropdown
                            value={status}
                            options={STATUS_OPTIONS}
                            onChange={setStatus}
                            placeholder="Status"
                            icon={<Filter className="w-4 h-4" />}
                        />
                        <FilterDropdown
                            value={priority}
                            options={PRIORITY_OPTIONS}
                            onChange={setPriority}
                            placeholder="Priority"
                            icon={<Tag className="w-4 h-4" />}
                        />
                        <FilterDropdown
                            value={selectedCategory}
                            options={CATEGORY_OPTIONS}
                            onChange={setSelectedCategory}
                            placeholder="Category"
                            icon={<Tag className="w-4 h-4" />}
                        />
                    </div>

                    <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                        <button
                            onClick={() => setView('list')}
                            className={`px-4 py-2 rounded-lg transition-all duration-300 ${view === 'list' ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50' : 'hover:bg-white/10'}`}
                        >
                            <List className={`w-4 h-4 ${view === 'list' ? 'text-purple-300' : 'text-slate-400'}`} />
                        </button>
                        <button
                            onClick={() => setView('kanban')}
                            className={`px-4 py-2 rounded-lg transition-all duration-300 ${view === 'kanban' ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50' : 'hover:bg-white/10'}`}
                        >
                            <LayoutGrid className={`w-4 h-4 ${view === 'kanban' ? 'text-purple-300' : 'text-slate-400'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}