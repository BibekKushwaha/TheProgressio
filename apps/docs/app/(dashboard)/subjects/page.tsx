'use client';

import { useState } from 'react';
import { useGetCategoriesQuery, useGetTasksQuery } from '@repo/store';
import { GPACalculator } from '@/components/analytics/GPACalculator';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, GraduationCap, ChevronRight, Layers, Filter, Calendar, Target } from 'lucide-react';
import Link from 'next/link';

export default function SubjectLibraryPage() {
    const { data: categories, isLoading: catLoading } = useGetCategoriesQuery();
    const { data: allTasks } = useGetTasksQuery();
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [showGPA, setShowGPA] = useState(false);

    const subjects = categories || [];
    const tasks = allTasks || [];

    // Count tasks per category
    const taskCountByCategory = tasks.reduce((acc: Record<string, number>, task) => {
        if (task.categoryId) {
            acc[task.categoryId] = (acc[task.categoryId] || 0) + 1;
        }
        return acc;
    }, {});

    // Completion rate per category
    const completionByCategory = tasks.reduce((acc: Record<string, { done: number; total: number }>, task) => {
        if (task.categoryId) {
            if (!acc[task.categoryId]) acc[task.categoryId] = { done: 0, total: 0 };
            acc[task.categoryId]!.total++;
            if (task.status === 'COMPLETED') acc[task.categoryId]!.done++;
        }
        return acc;
    }, {});

    const selectedTasks = selectedSubject
        ? tasks.filter(t => t.categoryId === selectedSubject)
        : [];

    const selectedCat = subjects.find(s => s.id === selectedSubject);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-white p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                            <BookOpen className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                                Subject Library
                            </h1>
                            <p className="text-slate-400 mt-1">Knowledge hub organized by subject with color-coding</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowGPA(!showGPA)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
                    >
                        <GraduationCap className="w-5 h-5" />
                        {showGPA ? 'Hide' : 'What-If'} GPA
                    </button>
                </div>

                {/* GPA What-If Calculator (toggle) */}
                {showGPA && (
                    <div className="animate-in slide-in-from-top-4 duration-300">
                        <GPACalculator />
                    </div>
                )}

                {/* Subject Grid */}
                {catLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className="h-40 rounded-2xl bg-white/5" />
                        ))}
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                        <Layers className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-300 mb-2">No subjects found</h3>
                        <p className="text-slate-500">Create categories in the Tasks Hub to see subjects here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {subjects.map((subject) => {
                            const color = subject.colorCode || '#6366f1';
                            const count = taskCountByCategory[subject.id] || 0;
                            const stats = completionByCategory[subject.id] || { done: 0, total: 0 };
                            const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
                            const isSelected = selectedSubject === subject.id;

                            return (
                                <button
                                    key={subject.id}
                                    onClick={() => setSelectedSubject(isSelected ? null : subject.id)}
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
                                                <p className="text-sm text-slate-400">{count} tasks</p>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                                    </div>

                                    {/* Progress bar */}
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
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Selected Subject Detail */}
                {selectedSubject && selectedCat && (
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${selectedCat.colorCode || '#6366f1'}30`, color: selectedCat.colorCode || '#6366f1' }}
                                >
                                    {selectedCat.icon || selectedCat.name[0]}
                                </div>
                                {selectedCat.name} — Tasks
                            </h2>
                            <div className="flex gap-3">
                                <Link
                                    href={`/planner?category=${selectedSubject}`}
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                                >
                                    <Filter className="w-4 h-4" /> Planner
                                </Link>
                                <Link
                                    href="/calendar"
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4" /> Timetable
                                </Link>
                                <Link
                                    href="/exam-warroom"
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                                >
                                    <Target className="w-4 h-4" /> SWOT
                                </Link>
                            </div>
                        </div>

                        {selectedTasks.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No tasks in this subject yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {selectedTasks.map(task => (
                                    <Link
                                        key={task.id}
                                        href={`/planner/${task.id}`}
                                        className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${task.status === 'COMPLETED' ? 'bg-green-400' :
                                                task.status === 'IN_PROGRESS' ? 'bg-yellow-400' : 'bg-slate-400'
                                                }`} />
                                            <div>
                                                <span className="text-white font-medium group-hover:text-indigo-300 transition-colors">
                                                    {task.title}
                                                </span>
                                                {task.dueDate && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Due: {new Date(task.dueDate).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${task.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                            task.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-green-500/20 text-green-400'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
