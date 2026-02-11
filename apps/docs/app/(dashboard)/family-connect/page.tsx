'use client';

import { useGetTasksQuery, useGetHabitsQuery, useGetDailySummaryQuery, useGetProfileQuery } from '@repo/store';
import { Eye, Shield, Heart, TrendingUp, CheckCircle, Flame, Clock, AlertTriangle, BookOpen, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function FamilyConnectPage() {
    type Task = {
        id: string;
        title: string;
        status: string;
        dueDate?: string | null;
        priority?: string | null;
        category?: { name: string } | null;
    };

    type Habit = {
        id: string;
        name: string;
        icon?: string | null;
        currentStreak?: number | null;
    };

    type Summary = {
        totalFocusMinutes?: number;
        tasksCompleted?: number;
        avgFocusMinutes?: number;
        consistencyScore?: number;
    };

    const { data: profileData } = useGetProfileQuery();
    const { data: allTasks, isLoading: tasksLoading } = useGetTasksQuery();
    const { data: habitsData, isLoading: habitsLoading } = useGetHabitsQuery();
    const { data: summaryData, isLoading: summaryLoading } = useGetDailySummaryQuery('7');

    const user = profileData?.user;
    const tasks = ((allTasks || []) as Task[]).filter(Boolean);
    const habits =
        typeof habitsData === 'object' && habitsData !== null && 'habits' in habitsData
            ? ((habitsData as { habits?: Habit[] }).habits || [])
            : [];
    const summary =
        typeof summaryData === 'object' && summaryData !== null && 'summary' in summaryData
            ? (summaryData as { summary?: Summary }).summary
            : undefined;

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Workload intensity (tasks due in next 3 days)
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingTasks = tasks.filter(t => {
        if (!t.dueDate || t.status === 'COMPLETED') return false;
        const due = new Date(t.dueDate);
        return due >= now && due <= threeDaysLater;
    });
    const workloadIntensity = upcomingTasks.length >= 5 ? 'High' : upcomingTasks.length >= 3 ? 'Medium' : 'Low';

    const isLoading = tasksLoading || habitsLoading || summaryLoading;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-white p-6 md:p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-64 bg-white/5" />
                    <Skeleton className="h-6 w-96 bg-white/5" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 bg-white/5 rounded-2xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-white p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl shadow-lg shadow-pink-500/20">
                            <Heart className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                                Family Connect
                            </h1>
                            <p className="text-slate-400 mt-1">
                                Read-only progress dashboard for {user?.username || 'Student'}
                            </p>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors">
                        <Share2 className="w-4 h-4" />
                        Share Link
                    </button>
                </div>

                {/* Read-Only Notice */}
                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <Eye className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm text-slate-300">
                        <span className="font-bold text-indigo-400">Read-only view</span> — Mentors and parents can monitor progress without editing any data.
                    </span>
                    <Shield className="w-4 h-4 text-indigo-400 ml-auto" />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-center">
                        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <div className="text-3xl font-black text-white">{completionRate}%</div>
                        <div className="text-xs text-slate-400 mt-1">Tasks Completed</div>
                        <div className="text-xs text-slate-500">{completedTasks}/{totalTasks} total</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-center">
                        <Flame className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                        <div className="text-3xl font-black text-white">{habits.length}</div>
                        <div className="text-xs text-slate-400 mt-1">Active Habits</div>
                        <div className="text-xs text-slate-500">tracked daily</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-center">
                        <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <div className="text-3xl font-black text-white">{summary?.totalFocusMinutes ? Math.round(summary.totalFocusMinutes / 60) : 0}h</div>
                        <div className="text-xs text-slate-400 mt-1">Focus Time (7d)</div>
                        <div className="text-xs text-slate-500">deep work logged</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-center">
                        <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${workloadIntensity === 'High' ? 'text-red-400' : workloadIntensity === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`} />
                        <div className={`text-3xl font-black ${workloadIntensity === 'High' ? 'text-red-400' : workloadIntensity === 'Medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                            {workloadIntensity}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Workload (3d)</div>
                        <div className="text-xs text-slate-500">{upcomingTasks.length} tasks due</div>
                    </div>
                </div>

                {/* Upcoming Tasks (read-only) */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                        Upcoming Assignments
                    </h2>
                    {upcomingTasks.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No urgent assignments in the next 3 days. 🎉</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingTasks.slice(0, 8).map(task => {
                                const daysLeft = task.dueDate ? Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 99;
                                return (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${task.priority === 'HIGH' ? 'bg-red-400' : task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'
                                                }`} />
                                            <span className="text-sm text-white font-medium">{task.title}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {task.category && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                                    {task.category.name}
                                                </span>
                                            )}
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${daysLeft <= 1 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Habits Overview (read-only) */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-400" />
                        Habit Streaks
                    </h2>
                    {habits.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No habits tracked yet.</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {habits.map((habit) => (
                                <div key={habit.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                    <div className="text-2xl">{habit.icon || '📌'}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{habit.name}</div>
                                        <div className="text-xs text-slate-400">
                                            {habit.currentStreak ?? 0} day streak
                                        </div>
                                    </div>
                                    <div className={`text-xs font-bold px-2 py-0.5 rounded ${(habit.currentStreak ?? 0) > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-slate-400'
                                        }`}>
                                        🔥 {habit.currentStreak ?? 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Weekly Analytics (read-only) */}
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Weekly Summary
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{summary?.tasksCompleted ?? 0}</div>
                            <div className="text-xs text-slate-400 mt-1">Tasks finished</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{summary?.avgFocusMinutes ? Math.round(summary.avgFocusMinutes) : 0}m</div>
                            <div className="text-xs text-slate-400 mt-1">Avg. daily focus</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{summary?.consistencyScore ?? 0}%</div>
                            <div className="text-xs text-slate-400 mt-1">Consistency score</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
