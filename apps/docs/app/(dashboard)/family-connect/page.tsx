'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    useCreateFamilyLinkMutation,
    useGetDailySummaryQuery,
    useGetFamilyLinksQuery,
    useGetHabitsQuery,
    useGetProfileQuery,
    useGetTasksQuery,
    useRevokeFamilyLinkMutation,
} from '@repo/store';
import { Eye, Shield, Heart, TrendingUp, CheckCircle, Flame, Clock, AlertTriangle, BookOpen, Share2, Link2, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';

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
    totalMinutes?: number;
    totalTasksCompleted?: number;
    avgHoursPerDay?: number;
};

const PLANNER_SERVICE_URL = process.env.NEXT_PUBLIC_PLANNER_SERVICE_URL || 'http://localhost:4001';
const HABIT_SERVICE_URL = process.env.NEXT_PUBLIC_HABIT_SERVICE_URL || 'http://localhost:4002';
const ANALYTICS_SERVICE_URL = process.env.NEXT_PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:4003';

export default function FamilyConnectPage() {
    const searchParams = useSearchParams();
    const shareToken = searchParams.get('shareToken') || '';
    const isSharedView = Boolean(shareToken);

    const [sharedLoading, setSharedLoading] = useState(false);
    const [sharedError, setSharedError] = useState<string | null>(null);
    const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
    const [sharedHabits, setSharedHabits] = useState<Habit[]>([]);
    const [sharedSummary, setSharedSummary] = useState<Summary | null>(null);

    const { data: profileData } = useGetProfileQuery(undefined, { skip: isSharedView });
    const { data: allTasks, isLoading: tasksLoading } = useGetTasksQuery(undefined, { skip: isSharedView });
    const { data: habitsData, isLoading: habitsLoading } = useGetHabitsQuery(undefined, { skip: isSharedView });
    const { data: summaryData, isLoading: summaryLoading } = useGetDailySummaryQuery('7', { skip: isSharedView });
    const { data: linksData } = useGetFamilyLinksQuery(undefined, { skip: isSharedView });
    const [createFamilyLink, { isLoading: isCreatingLink }] = useCreateFamilyLinkMutation();
    const [revokeFamilyLink] = useRevokeFamilyLinkMutation();
    const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isSharedView) return;

        const controller = new AbortController();
        const fetchSharedData = async () => {
            setSharedLoading(true);
            setSharedError(null);
            try {
                const headers = { 'x-family-share-token': shareToken };
                const [tasksRes, habitsRes, summaryRes] = await Promise.all([
                    fetch(`${PLANNER_SERVICE_URL}/api/tasks?limit=300`, {
                        method: 'GET',
                        headers,
                        signal: controller.signal,
                    }),
                    fetch(`${HABIT_SERVICE_URL}/api/habits`, {
                        method: 'GET',
                        headers,
                        signal: controller.signal,
                    }),
                    fetch(`${ANALYTICS_SERVICE_URL}/api/stats/daily?days=7`, {
                        method: 'GET',
                        headers,
                        signal: controller.signal,
                    }),
                ]);

                if (!tasksRes.ok || !habitsRes.ok || !summaryRes.ok) {
                    throw new Error('Share token is invalid, expired, or missing permissions');
                }

                const tasksJson = (await tasksRes.json()) as Task[];
                const habitsJson = (await habitsRes.json()) as { habits?: Habit[] };
                const summaryJson = (await summaryRes.json()) as { stats?: Summary };

                setSharedTasks(Array.isArray(tasksJson) ? tasksJson : []);
                setSharedHabits(Array.isArray(habitsJson?.habits) ? habitsJson.habits : []);
                setSharedSummary(summaryJson?.stats || null);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setSharedError(error instanceof Error ? error.message : 'Failed to load shared dashboard');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setSharedLoading(false);
                }
            }
        };

        void fetchSharedData();
        return () => controller.abort();
    }, [isSharedView, shareToken]);

    const user = profileData?.user;
    const tasks = isSharedView ? sharedTasks : ((allTasks || []) as Task[]);
    const habits = isSharedView
        ? sharedHabits
        : ((habitsData as { habits?: Habit[] } | undefined)?.habits || []);
    const summary = isSharedView ? sharedSummary : (summaryData?.stats || null);

    const completedTasks = tasks.filter((task) => task.status === 'COMPLETED').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingTasks = tasks.filter((task) => {
        if (!task.dueDate || task.status === 'COMPLETED') return false;
        const due = new Date(task.dueDate);
        return due >= now && due <= threeDaysLater;
    });
    const workloadIntensity = upcomingTasks.length >= 5 ? 'High' : upcomingTasks.length >= 3 ? 'Medium' : 'Low';

    const isLoading = isSharedView ? sharedLoading : (tasksLoading || habitsLoading || summaryLoading);

    const linkItems = useMemo(() => linksData?.links || [], [linksData?.links]);

    const handleCreateLink = async () => {
        const response = await createFamilyLink({
            label: 'Mentor / Family Link',
            permissions: 'READ_ONLY',
            expiresInDays: 14,
        }).unwrap();

        if (typeof window !== 'undefined') {
            const url = `${window.location.origin}/family-connect?shareToken=${response.shareToken}`;
            setGeneratedShareUrl(url);
        }
    };

    const handleRevokeLink = async (linkId: string) => {
        await revokeFamilyLink(linkId).unwrap();
    };

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

    if (sharedError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-white p-6 md:p-8">
                <div className="max-w-4xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
                    <h1 className="text-xl font-bold">Unable to load shared dashboard</h1>
                    <p className="mt-2 text-sm">{sharedError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-white p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
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
                                Read-only progress dashboard {isSharedView ? '(Shared Session)' : `for ${user?.username || 'Student'}`}
                            </p>
                        </div>
                    </div>
                    {!isSharedView && (
                        <button
                            onClick={handleCreateLink}
                            disabled={isCreatingLink}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-60"
                        >
                            <Share2 className="w-4 h-4" />
                            {isCreatingLink ? 'Creating...' : 'Create Share Link'}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                    <Eye className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm text-slate-300">
                        <span className="font-bold text-indigo-400">Read-only view</span> — Mentor sessions are blocked from write operations at middleware.
                    </span>
                    <Shield className="w-4 h-4 text-indigo-400 ml-auto" />
                </div>

                {!isSharedView && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-2">
                            <Link2 className="h-4 w-4 text-cyan-300" />
                            Share Links
                        </div>
                        {generatedShareUrl && (
                            <div className="mb-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
                                <p className="text-xs text-cyan-200 mb-1">Newly generated URL</p>
                                <p className="text-xs break-all text-cyan-100">{generatedShareUrl}</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            {linkItems.length === 0 ? (
                                <p className="text-xs text-slate-400">No active links yet.</p>
                            ) : (
                                linkItems.map((link) => (
                                    <div key={link.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                        <div>
                                            <p className="text-sm text-white">{link.label || 'Family Link'}</p>
                                            <p className="text-xs text-slate-400">
                                                {link.permissions} • expires {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'never'}
                                            </p>
                                        </div>
                                        {!link.revokedAt && (
                                            <button
                                                onClick={() => handleRevokeLink(link.id)}
                                                className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Revoke
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

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
                        <div className="text-3xl font-black text-white">{summary?.totalMinutes ? Math.round(summary.totalMinutes / 60) : 0}h</div>
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

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                        Upcoming Assignments
                    </h2>
                    {upcomingTasks.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No urgent assignments in the next 3 days.</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingTasks.slice(0, 8).map(task => {
                                const daysLeft = task.dueDate ? Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 99;
                                return (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${task.priority === 'HIGH' ? 'bg-red-400' : task.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                                            <span className="text-sm text-white font-medium">{task.title}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {task.category && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                                    {task.category.name}
                                                </span>
                                            )}
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${daysLeft <= 1 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

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
                                    <div className={`text-xs font-bold px-2 py-0.5 rounded ${(habit.currentStreak ?? 0) > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-white/10 text-slate-400'}`}>
                                        🔥 {habit.currentStreak ?? 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Weekly Summary
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{summary?.totalTasksCompleted ?? 0}</div>
                            <div className="text-xs text-slate-400 mt-1">Tasks finished</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{summary?.totalMinutes ? Math.round(summary.totalMinutes / 7) : 0}m</div>
                            <div className="text-xs text-slate-400 mt-1">Avg. daily focus</div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                            <div className="text-2xl font-black text-white">{completionRate}%</div>
                            <div className="text-xs text-slate-400 mt-1">Consistency score</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
