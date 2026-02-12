'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Habit,
    TaskStatus,
    useGetDailySummaryQuery,
    useGetFocusScoreQuery,
    useGetHabitsQuery,
    useGetProfileQuery,
    useGetTasksQuery,
    useGetWeeklyTrendsQuery,
} from '@repo/store';
import {
    AlertTriangle,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    Clock3,
    Copy,
    Eye,
    Flame,
    HeartHandshake,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type TrendPoint = {
    date: string;
    day: string;
    minutes: number;
    tasks: number;
    hours: number;
};

type ShareState = 'idle' | 'copied' | 'failed';

const DAY_OPTIONS = ['7', '14', '30'] as const;

function formatDueLabel(dueDate: string | null, now: Date): string {
    if (!dueDate) return 'No date';
    const diffMs = new Date(dueDate).getTime() - now.getTime();
    const dayDiff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (dayDiff < 0) return `${Math.abs(dayDiff)}d late`;
    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    return `${dayDiff}d left`;
}

function getWorkloadLevel(overdueCount: number, dueSoonCount: number): 'High' | 'Medium' | 'Low' {
    if (overdueCount > 0 || dueSoonCount >= 5) return 'High';
    if (dueSoonCount >= 3) return 'Medium';
    return 'Low';
}

export default function FamilyConnectPage() {
<<<<<<< HEAD
    const [selectedDays, setSelectedDays] = useState<(typeof DAY_OPTIONS)[number]>('7');
    const [shareState, setShareState] = useState<ShareState>('idle');
=======
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
>>>>>>> origin/main

    const { data: profileData } = useGetProfileQuery();
    const { data: allTasks, isLoading: tasksLoading, error: tasksError } = useGetTasksQuery({ page: 1, limit: 400 });
    const { data: habitsData, isLoading: habitsLoading, error: habitsError } = useGetHabitsQuery();
    const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useGetDailySummaryQuery(selectedDays);
    const { data: focusScoreData } = useGetFocusScoreQuery();
    const { data: weeklyTrendsData } = useGetWeeklyTrendsQuery();

    const user = profileData?.user;
<<<<<<< HEAD
    const tasks = allTasks || [];
    const habits = habitsData?.habits || [];
    const summaryStats = summaryData?.stats;
    const trendSeries = useMemo(
        () => (weeklyTrendsData?.data || []) as TrendPoint[],
        [weeklyTrendsData]
    );
=======
    const tasks = ((allTasks || []) as Task[]).filter(Boolean);
    const habits =
        typeof habitsData === 'object' && habitsData !== null && 'habits' in habitsData
            ? ((habitsData as { habits?: Habit[] }).habits || [])
            : [];
    const summary =
        typeof summaryData === 'object' && summaryData !== null && 'summary' in summaryData
            ? (summaryData as { summary?: Summary }).summary
            : undefined;
>>>>>>> origin/main

    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const completedTasks = tasks.filter((task) => task.status === TaskStatus.COMPLETED).length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const overdueTasks = tasks.filter((task) => {
        if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
        return new Date(task.dueDate).getTime() < now.getTime();
    });
<<<<<<< HEAD

    const dueSoonTasks = tasks
        .filter((task) => {
            if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
            const dueTime = new Date(task.dueDate).getTime();
            return dueTime >= now.getTime() && dueTime <= threeDaysLater.getTime();
        })
        .sort((a, b) => {
            const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });

    const upcomingWeekTasks = tasks
        .filter((task) => {
            if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
            const dueTime = new Date(task.dueDate).getTime();
            return dueTime >= now.getTime() && dueTime <= sevenDaysLater.getTime();
        })
        .sort((a, b) => {
            const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
            return aTime - bTime;
        });

    const focusMinutes = summaryStats?.totalMinutes ?? 0;
    const avgDailyFocus = Math.round(focusMinutes / Number(selectedDays));
    const focusScore = focusScoreData?.stats?.score ?? 0;
    const consistencyContribution = focusScoreData?.stats?.breakdown.consistency ?? 0;

    const atRiskHabits = habits.filter((habit) =>
        habit.streakStatus !== 'active' ||
        habit.streakHealth === 'at_risk' ||
        habit.streakHealth === 'broken'
    );
    const strongStreakHabits = habits.filter((habit) => (habit.currentStreak ?? 0) >= 7);
    const habitMomentum = habits.length > 0 ? Math.round((strongStreakHabits.length / habits.length) * 100) : 0;

    const workloadLevel = getWorkloadLevel(overdueTasks.length, dueSoonTasks.length);
    const workloadTone =
        workloadLevel === 'High'
            ? 'text-rose-300 border-rose-400/40 bg-rose-500/15'
            : workloadLevel === 'Medium'
                ? 'text-amber-300 border-amber-400/40 bg-amber-500/15'
                : 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15';

    const trendMaxMinutes = useMemo(
        () => Math.max(1, ...trendSeries.map((point) => point.minutes)),
        [trendSeries]
    );
=======
    const workloadIntensity = upcomingTasks.length >= 5 ? 'High' : upcomingTasks.length >= 3 ? 'Medium' : 'Low';
>>>>>>> origin/main

    const isLoading = tasksLoading || habitsLoading || summaryLoading;
    const hasPartialError = !!tasksError || !!habitsError || !!summaryError;

    const riskHighlights: string[] = [];
    if (overdueTasks.length > 0) riskHighlights.push(`${overdueTasks.length} overdue tasks need intervention.`);
    if (dueSoonTasks.length >= 4) riskHighlights.push(`${dueSoonTasks.length} tasks are due within 72 hours.`);
    if (atRiskHabits.length > 0) riskHighlights.push(`${atRiskHabits.length} habits have streak-risk signals.`);
    if (focusScore < 55) riskHighlights.push('Focus score is below target range this week.');
    if (riskHighlights.length === 0) riskHighlights.push('No critical risk signals detected in current window.');

    const handleShare = async () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const shareUrl = `${baseUrl}/family-connect?viewer=guardian&window=${selectedDays}`;

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setShareState('copied');
                setTimeout(() => setShareState('idle'), 2200);
                return;
            } catch {
                setShareState('failed');
                setTimeout(() => setShareState('idle'), 2200);
                return;
            }
        }

        setShareState('failed');
        setTimeout(() => setShareState('idle'), 2200);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.12),_transparent_42%),linear-gradient(120deg,_#020617_0%,_#0f172a_50%,_#111827_100%)] text-white p-6 md:p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton className="h-14 w-72 bg-white/5" />
                    <Skeleton className="h-7 w-[28rem] bg-white/5" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((item) => (
                            <Skeleton key={item} className="h-36 bg-white/5 rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-72 bg-white/5 rounded-3xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.12),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.08),_transparent_35%),linear-gradient(120deg,_#020617_0%,_#0f172a_50%,_#111827_100%)] text-white p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-cyan-500/10 p-6 md:p-8">
                    <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />
                    <div className="absolute -left-20 -bottom-24 h-60 w-60 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="p-4 bg-gradient-to-br from-rose-500 to-fuchsia-500 rounded-2xl shadow-lg shadow-rose-500/20">
                                <HeartHandshake className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-rose-100">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Privacy-safe read-only dashboard
                                </p>
                                <h1 className="mt-3 text-4xl font-black tracking-tight bg-gradient-to-r from-rose-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                                    Family Connect
                                </h1>
                                <p className="text-slate-300 mt-2">
                                    Weekly guardian pulse for {user?.username || 'Student'} with progress signals, risks, and support actions.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {DAY_OPTIONS.map((days) => (
                                <button
                                    key={days}
                                    onClick={() => setSelectedDays(days)}
                                    className={`px-3 py-2 rounded-xl text-sm border transition-colors ${selectedDays === days
                                        ? 'bg-white/20 border-white/40 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    {days}d
                                </button>
                            ))}
                            <button
                                onClick={handleShare}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-sm hover:bg-white/20 transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                                {shareState === 'copied' ? 'Link copied' : shareState === 'failed' ? 'Copy failed' : 'Share Link'}
                            </button>
                        </div>
                    </div>
                </section>

                {hasPartialError && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                        Some data blocks could not be refreshed. Showing the latest available snapshot.
                    </div>
                )}

                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">Task Completion</p>
                            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                        </div>
                        <p className="mt-3 text-3xl font-black">{completionRate}%</p>
                        <p className="text-xs text-slate-400 mt-1">{completedTasks}/{totalTasks} tasks done</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">Focus Time</p>
                            <Clock3 className="w-5 h-5 text-cyan-300" />
                        </div>
                        <p className="mt-3 text-3xl font-black">{Math.round(focusMinutes / 60)}h</p>
                        <p className="text-xs text-slate-400 mt-1">{avgDailyFocus} min/day avg ({selectedDays}d)</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">Habit Momentum</p>
                            <Flame className="w-5 h-5 text-orange-300" />
                        </div>
                        <p className="mt-3 text-3xl font-black">{habitMomentum}%</p>
                        <p className="text-xs text-slate-400 mt-1">{strongStreakHabits.length}/{habits.length} strong streaks</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-slate-400">Focus Score</p>
                            <TrendingUp className="w-5 h-5 text-violet-300" />
                        </div>
                        <p className="mt-3 text-3xl font-black">{focusScore}</p>
                        <p className="text-xs text-slate-400 mt-1">Consistency contribution: {Math.round(consistencyContribution)}</p>
                    </div>
                </section>

<<<<<<< HEAD
                <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-5">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-cyan-300" />
                                Guardian Risk Radar
                            </h2>
                            <span className={`px-3 py-1 rounded-full text-xs border ${workloadTone}`}>
                                Workload: {workloadLevel}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {riskHighlights.map((item) => (
                                <div
                                    key={item}
                                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                                >
                                    <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                                    <p className="text-sm text-slate-200">{item}</p>
=======
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
>>>>>>> origin/main
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-5">
                            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                                <p className="text-2xl font-black">{overdueTasks.length}</p>
                                <p className="text-xs text-slate-400">Overdue</p>
                            </div>
                            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                                <p className="text-2xl font-black">{dueSoonTasks.length}</p>
                                <p className="text-xs text-slate-400">Due in 72h</p>
                            </div>
                            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                                <p className="text-2xl font-black">{summaryStats?.totalTasksCompleted ?? 0}</p>
                                <p className="text-xs text-slate-400">Completed ({selectedDays}d)</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-emerald-300" />
                            7-Day Activity Pulse
                        </h2>
                        {trendSeries.length === 0 ? (
                            <p className="text-sm text-slate-400 py-6 text-center">No trend data yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {trendSeries.map((point) => (
                                    <div key={point.date} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3">
                                        <span className="text-xs text-slate-400">{point.day}</span>
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                                                style={{ width: `${Math.max(8, Math.round((point.minutes / trendMaxMinutes) * 100))}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-300">
                                            {point.minutes}m / {point.tasks}t
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-5">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                            <BookOpen className="w-5 h-5 text-cyan-300" />
                            Upcoming Assignments
                        </h2>
                        {upcomingWeekTasks.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No deadlines in the next week.</p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingWeekTasks.slice(0, 10).map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{task.title}</p>
                                            <div className="mt-1 flex flex-wrap gap-2">
                                                <span className="text-xs rounded-md bg-white/10 px-2 py-0.5 text-slate-300">
                                                    {task.category?.name || 'No category'}
                                                </span>
                                                <span className={`text-xs rounded-md px-2 py-0.5 ${task.priority === 'HIGH'
                                                    ? 'bg-rose-500/20 text-rose-300'
                                                    : task.priority === 'MEDIUM'
                                                        ? 'bg-amber-500/20 text-amber-300'
                                                        : 'bg-emerald-500/20 text-emerald-300'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${task.dueDate && new Date(task.dueDate).getTime() < now.getTime()
                                            ? 'bg-rose-500/20 text-rose-300'
                                            : 'bg-cyan-500/20 text-cyan-300'
                                            }`}>
                                            {formatDueLabel(task.dueDate, now)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-rose-300" />
                            Habit Streak Health
                        </h2>
                        {habits.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No habits tracked yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {habits.slice(0, 8).map((habit: Habit) => (
                                    <div key={habit.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">{habit.icon || 'o'} {habit.name}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {habit.currentStreak ?? 0} day streak, longest {habit.longestStreak ?? 0}
                                                </p>
                                            </div>
                                            <span className={`text-xs rounded-md px-2 py-1 ${habit.streakStatus === 'active'
                                                ? 'bg-emerald-500/20 text-emerald-300'
                                                : 'bg-amber-500/20 text-amber-300'
                                                }`}>
                                                {habit.streakStatus}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-rose-500/10 p-5 md:p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-lg font-bold">Suggested Family Actions This Week</h3>
                            <p className="text-sm text-slate-300 mt-1">
                                Encourage completion of overdue work first, then protect focused study blocks and habit streak continuity.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href="/planner"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-sm hover:bg-white/20 transition-colors"
                            >
                                View Planner <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/habits"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-sm hover:bg-white/20 transition-colors"
                            >
                                Review Habits <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Eye className="w-3.5 h-3.5" />
                    Read-only mode is enforced. This page cannot modify student data.
                </div>
            </div>
        </div>
    );
}
