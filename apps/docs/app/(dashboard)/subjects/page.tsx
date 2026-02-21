'use client';
// trigger rebuild


import { useMemo, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { TaskStatus, useGetCategoriesQuery, useGetTasksQuery } from '@repo/store';
import { GPACalculator } from '@/components/analytics/GPACalculator';
import { SubjectGradePredictor } from '@/components/analytics/SubjectGradePredictor';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertTriangle,
    ArrowUpDown,
    BarChart3,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock3,
    FolderKanban,
    GraduationCap,
    Layers,
    Search,
    Sparkles,
    Target,
} from 'lucide-react';
import Link from 'next/link';

type SubjectSortMode = 'name' | 'tasks' | 'completion';
type SubjectTaskStatusFilter = 'all' | TaskStatus.PENDING | TaskStatus.IN_PROGRESS | TaskStatus.COMPLETED;

export default function SubjectLibraryPage() {
    const { data: categories, isLoading: catLoading } = useGetCategoriesQuery();
    const { data: allTasks, isLoading: tasksLoading } = useGetTasksQuery({ page: 1, limit: 100 });
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [showGPA, setShowGPA] = useState(false);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [subjectSort, setSubjectSort] = useState<SubjectSortMode>('completion');
    const [selectedTaskSearch, setSelectedTaskSearch] = useState('');
    const [selectedTaskStatus, setSelectedTaskStatus] = useState<SubjectTaskStatusFilter>('all');

    const selectedSubjectTasksQueryArgs = selectedSubject
        ? { page: 1, limit: 300, categoryId: selectedSubject }
        : skipToken;
    const { data: selectedSubjectTasks, isFetching: selectedTasksLoading } = useGetTasksQuery(selectedSubjectTasksQueryArgs);

    const subjects = useMemo(() => categories || [], [categories]);
    const tasks = useMemo(() => allTasks || [], [allTasks]);

    const statsBySubject = useMemo(() => {
        return tasks.reduce((acc: Record<string, { total: number; done: number; inProgress: number; pending: number }>, task) => {
            if (!task.categoryId) return acc;
            if (!acc[task.categoryId]) {
                acc[task.categoryId] = { total: 0, done: 0, inProgress: 0, pending: 0 };
            }

            acc[task.categoryId]!.total += 1;
            if (task.status === TaskStatus.COMPLETED) acc[task.categoryId]!.done += 1;
            if (task.status === TaskStatus.IN_PROGRESS) acc[task.categoryId]!.inProgress += 1;
            if (task.status === TaskStatus.PENDING) acc[task.categoryId]!.pending += 1;
            return acc;
        }, {});
    }, [tasks]);

    const selectedCat = useMemo(
        () => subjects.find((subject) => subject.id === selectedSubject),
        [subjects, selectedSubject]
    );

    const overview = useMemo(() => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
        const inProgressTasks = tasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length;
        const activeSubjects = subjects.filter(subject => (statsBySubject[subject.id]?.total || 0) > 0).length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return { totalTasks, completedTasks, inProgressTasks, activeSubjects, completionRate };
    }, [subjects, tasks, statsBySubject]);

    const visibleSubjects = useMemo(() => {
        const filtered = subjects.filter((subject) =>
            subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
        );

        filtered.sort((a, b) => {
            const aStats = statsBySubject[a.id] || { total: 0, done: 0, inProgress: 0, pending: 0 };
            const bStats = statsBySubject[b.id] || { total: 0, done: 0, inProgress: 0, pending: 0 };
            const aCompletion = aStats.total ? aStats.done / aStats.total : 0;
            const bCompletion = bStats.total ? bStats.done / bStats.total : 0;

            if (subjectSort === 'tasks') return bStats.total - aStats.total;
            if (subjectSort === 'completion') return bCompletion - aCompletion;
            return a.name.localeCompare(b.name);
        });

        return filtered;
    }, [subjects, subjectSearch, subjectSort, statsBySubject]);

    const selectedTasks = useMemo(() => {
        if (!selectedSubject) return [];

        const baseTasks =
            selectedSubjectTasks ||
            tasks.filter(task => task.categoryId === selectedSubject);

        return baseTasks.filter((task) => {
            const matchesStatus = selectedTaskStatus === 'all' || task.status === selectedTaskStatus;
            const matchesSearch =
                !selectedTaskSearch ||
                task.title.toLowerCase().includes(selectedTaskSearch.toLowerCase()) ||
                task.description?.toLowerCase().includes(selectedTaskSearch.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [selectedSubject, selectedSubjectTasks, tasks, selectedTaskSearch, selectedTaskStatus]);

    const subjectPulse = useMemo(() => {
        return subjects
            .map((subject) => {
                const stats = statsBySubject[subject.id] || { total: 0, done: 0, inProgress: 0, pending: 0 };
                const completion = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                return {
                    id: subject.id,
                    name: subject.name,
                    total: stats.total,
                    completion,
                };
            })
            .filter((entry) => entry.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
    }, [subjects, statsBySubject]);


    const riskHighlights = useMemo(() => {
        const highlights: string[] = [];
        const overloaded = subjects.filter((subject) => {
            const stats = statsBySubject[subject.id] || { total: 0, done: 0, inProgress: 0, pending: 0 };
            return stats.total > 0 && (stats.inProgress + stats.pending) - stats.done >= 3;
        });

        if (overloaded.length > 0) {
            highlights.push(`${overloaded.length} subject${overloaded.length > 1 ? 's are' : ' is'} workload-heavy this cycle.`);
        }
        if (overview.completionRate < 60 && overview.totalTasks > 0) {
            highlights.push('Completion rate is below 60%, prioritize pending-heavy subjects first.');
        }
        if (overview.inProgressTasks >= 8) {
            highlights.push('High in-progress volume detected; close tasks before opening new ones.');
        }
        if (highlights.length === 0) {
            highlights.push('Risk posture is stable. Keep current completion pace and consistency.');
        }

        return highlights.slice(0, 3);
    }, [subjects, statsBySubject, overview]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20">
                        <FolderKanban className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                            Subject Library
                        </h1>
                        <p className="text-slate-400 mt-1">Track workload, Completion Speed, and Subject-level momentum.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowGPA(!showGPA)}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center gap-2"
                    >
                        <GraduationCap className="w-5 h-5" />
                        {showGPA ? 'Hide' : 'What-If'} GPA
                    </button>
                </div>
            </div>

            {showGPA && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                    <GPACalculator />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">Total Tasks</p>
                        <FolderKanban className="w-4 h-4 text-cyan-300" />
                    </div>
                    <p className="text-3xl font-bold mt-3">{overview.totalTasks}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">Completion Rate</p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    </div>
                    <p className="text-3xl font-bold mt-3">{overview.completionRate}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">In Progress</p>
                        <Clock3 className="w-4 h-4 text-amber-300" />
                    </div>
                    <p className="text-3xl font-bold mt-3">{overview.inProgressTasks}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">Active Subjects</p>
                        <Sparkles className="w-4 h-4 text-violet-300" />
                    </div>
                    <p className="text-3xl font-bold mt-3">{overview.activeSubjects}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            value={subjectSearch}
                            onChange={(event) => setSubjectSearch(event.target.value)}
                            placeholder="Search subjects..."
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-slate-400" />
                        <select
                            value={subjectSort}
                            onChange={(event) => setSubjectSort(event.target.value as SubjectSortMode)}
                            className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        >
                            <option value="completion">Sort: Completion</option>
                            <option value="tasks">Sort: Task Count</option>
                            <option value="name">Sort: Name</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-300" />
                            Subject Risk Radar
                        </h2>
                        <span className={`px-2.5 py-1 rounded-full text-xs border ${overview.completionRate < 60
                            ? 'bg-red-500/15 border-red-400/30 text-red-200'
                            : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                            }`}>
                            {overview.completionRate < 60 ? 'Attention' : 'Stable'}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {riskHighlights.map((item) => (
                            <div key={item} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-cyan-300" />
                        Learning Pulse
                    </h2>
                    {subjectPulse.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">No subject activity yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {subjectPulse.map((entry) => (
                                <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                                    <div className="min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-sm text-white truncate">{entry.name}</p>
                                            <span className="text-xs text-slate-400">{entry.completion}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                                                style={{ width: `${Math.max(8, entry.completion)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-300">{entry.total} tasks</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {catLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />
                    ))}
                </div>
            ) : visibleSubjects.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <Layers className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-300 mb-2">No matching subjects</h3>
                    <p className="text-slate-500">
                        {subjectSearch ? 'Try another search keyword.' : 'Create categories in the planner to populate this library.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleSubjects.map((subject) => {
                        const color = subject.colorCode || '#6366f1';
                        const stats = statsBySubject[subject.id] || { done: 0, total: 0, inProgress: 0, pending: 0 };
                        const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                        const isSelected = selectedSubject === subject.id;

                        return (
                            <button
                                key={subject.id}
                                onClick={() => {
                                    setSelectedSubject(subject.id);
                                }}
                                className={`text-left bg-white/5 backdrop-blur-md border-2 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${isSelected
                                    ? 'shadow-lg scale-[1.02]'
                                    : 'border-white/10 hover:border-white/20'
                                    }`}
                                style={{
                                    borderColor: isSelected ? color : undefined,
                                    boxShadow: isSelected ? `0 0 30px ${color}30` : undefined,
                                }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                                            style={{ backgroundColor: `${color}30`, color }}
                                        >
                                            {subject.icon || subject.name[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{subject.name}</h3>
                                            <p className="text-sm text-slate-400">{stats.total} tasks tracked</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Completion</span>
                                        <span className="text-white font-semibold">{completionPct}%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${completionPct}%`, backgroundColor: color }}
                                        />
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-emerald-300 text-center">
                                        {stats.done} done
                                    </div>
                                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-amber-300 text-center">
                                        {stats.inProgress} live
                                    </div>
                                    <div className="rounded-lg bg-slate-500/20 border border-white/10 px-2 py-1 text-slate-300 text-center">
                                        {stats.pending} queued
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!selectedSubject} onOpenChange={(open) => !open && setSelectedSubject(null)} >
                <DialogContent className="sm:max-w-[1000px] w-[95vw] max-h-[95vh] overflow-hidden flex flex-col bg-slate-950/95 border-slate-800 backdrop-blur-xl p-0 gap-0">
                    {selectedCat && (
                        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-300 overflow-y-auto flex-1">
                            <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                                <DialogHeader className="flex-shrink-0">
                                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3 whitespace-nowrap">
                                        {selectedCat.name} — Tasks
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Task management and detailed breakdown for {selectedCat.name}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                                    <Link
                                        href={`/calendar?categoryId=${selectedSubject}`}
                                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center text-gray-400 gap-2 whitespace-nowrap"
                                    >
                                        <Calendar className="w-4 h-4" /> Timetable
                                    </Link>
                                    <Link
                                        href={`/exam-warroom?categoryId=${selectedSubject}`}
                                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center text-gray-400 whitespace-nowrap gap-2"
                                    >
                                        <Target className="w-4 h-4" /> SWOT
                                    </Link>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
                                {/* Task List Section */}
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                                        <div className="relative flex-grow max-w-sm">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="text"
                                                placeholder="Search tasks in this subject..."
                                                value={selectedTaskSearch}
                                                onChange={(e) => setSelectedTaskSearch(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(['all', TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED] as SubjectTaskStatusFilter[]).map((status) => (
                                                <button
                                                    key={status}
                                                    onClick={() => setSelectedTaskStatus(status)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${selectedTaskStatus === status
                                                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedTasksLoading ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3].map((index) => (
                                                <Skeleton key={index} className="h-20 w-full rounded-xl bg-white/5" />
                                            ))}
                                        </div>
                                    ) : selectedTasks.length === 0 ? (
                                        <p className="text-slate-400 text-center py-8">
                                            {selectedTaskSearch || selectedTaskStatus !== 'all'
                                                ? 'No tasks match the current filters.'
                                                : 'No tasks in this subject yet.'}
                                        </p>
                                    ) : (
                                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                                            {selectedTasks.map(task => (
                                                <Link
                                                    key={task.id}
                                                    href={`/tasks/${task.id}`}
                                                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full ${task.status === 'COMPLETED' ? 'bg-green-400' :
                                                            task.status === 'IN_PROGRESS' ? 'bg-yellow-400' : 'bg-slate-400'
                                                            }`} />
                                                        <div>
                                                            <span className="text-sm text-white font-medium group-hover:text-cyan-300 transition-colors">
                                                                {task.title}
                                                            </span>
                                                            {task.dueDate && (
                                                                <p className="text-[10px] text-slate-500 mt-0.5">
                                                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] font-semibold ${task.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                                            task.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {task.priority}
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Sidebar: AI Predictions */}
                                <div className="space-y-6">
                                    <SubjectGradePredictor
                                        subjectId={selectedSubject!}
                                        subjectName={selectedCat.name}
                                    />

                                    <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl">
                                        <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm mb-3">
                                            <Target className="w-4 h-4" />
                                            Strategic Focus
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            Based on your performance in {selectedCat.name}, our model recommends a high-intensity session with periodic breaks this week.
                                        </p>
                                        <Link
                                            href="/exam-warroom"
                                            className="w-full h-10 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl flex items-center justify-center text-xs text-indigo-200 transition-all font-semibold"
                                        >
                                            View Complete SWOT Analysis
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {tasksLoading && !catLoading && (
                <p className="text-xs text-slate-500 text-center">Refreshing task insights...</p>
            )}
        </div>
    );
}
