"use client"
import { Search, Filter, Tag, LayoutGrid, Calendar } from 'lucide-react';
import { TaskStatus, PriorityEnum } from '@repo/store';
import { FilterDropdown } from './planner/FilterDropdown';


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


interface SearchBarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    status?: string;
    setStatus?: (status: any) => void;
    priority?: string;
    setPriority?: (priority: any) => void;
    selectedCategory?: string;
    setSelectedCategory?: (category: any) => void;
    view?: 'kanban' | 'list' | 'timetable';
    setView?: (view: 'kanban' | 'list' | 'timetable') => void;
    STATUS_OPTIONS?: readonly { label: string; value: string }[];
    PRIORITY_OPTIONS?: readonly { label: string; value: string }[];
    CATEGORY_OPTIONS?: readonly { label: string; value: string; color?: string }[];
}

export function SearchBar({
    searchQuery,
    setSearchQuery,
    priority,
    setPriority,
    selectedCategory,
    setSelectedCategory,
    view,
    setView,
    STATUS_OPTIONS: propStatusOptions,
    PRIORITY_OPTIONS: propPriorityOptions,
    CATEGORY_OPTIONS: propCategoryOptions
}: SearchBarProps) {

    const currentPriorityOptions = propPriorityOptions || PRIORITY_OPTIONS;
    const currentCategoryOptions = propCategoryOptions || CATEGORY_OPTIONS;

    return (
        <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl p-3 md:p-4 ml-0.5">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative ml-3">
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
                        {priority && setPriority && (
                            <FilterDropdown
                                value={priority}
                                options={currentPriorityOptions}
                                onChange={setPriority}
                                placeholder="Priority"
                                icon={<Tag className="w-4 h-4" />}
                            />
                        )}
                        {selectedCategory && setSelectedCategory && (
                            <FilterDropdown
                                value={selectedCategory}
                                options={currentCategoryOptions}
                                onChange={setSelectedCategory}
                                placeholder="Category"
                                icon={<Tag className="w-4 h-4" />}
                            />
                        )}
                    </div>
                    {view && setView && (
                        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                            <button
                                onClick={() => setView('kanban')}
                                className={`px-4 py-2 rounded-lg transition-all duration-300 ${view === 'kanban' ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50' : 'hover:bg-white/10'}`}
                            >
                                <LayoutGrid className={`w-4 h-4 ${view === 'kanban' ? 'text-purple-300' : 'text-slate-400'}`} />
                            </button>
                            <button
                                onClick={() => setView('timetable')}
                                className={`px-4 py-2 rounded-lg transition-all duration-300 ${view === 'timetable' ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50' : 'hover:bg-white/10'}`}
                            >
                                <Calendar className={`w-4 h-4 ${view === 'timetable' ? 'text-purple-300' : 'text-slate-400'}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}