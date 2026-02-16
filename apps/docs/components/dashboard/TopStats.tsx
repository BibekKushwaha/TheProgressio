"use client";

// components/dashboard/TopStats.tsx
import { Target, Flame } from 'lucide-react';
import { useGetDailySummaryQuery, useGetFocusScoreQuery, useGetUserStreakQuery, useGetActiveLiveSessionQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';
import { toLocalDateKey, normalizeDateInput } from '@/lib/date';

export function TopStats() {
    // Enable light polling and refetch-on-focus so the dashboard reflects recent changes
    const { data: summaryData, isLoading: isSummaryLoading } = useGetDailySummaryQuery("1", {
        pollingInterval: 30000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });
    const { data: focusScoreData, isLoading: isFocusLoading } = useGetFocusScoreQuery(undefined, {
        pollingInterval: 30000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });
    const { data: streakData, isLoading: isStreakLoading } = useGetUserStreakQuery(undefined, {
        pollingInterval: 30000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    const stats = summaryData?.stats;
    const totalHoursRaw = stats?.totalHours ?? 0;

    // include currently active live session time provisionally so the dashboard reflects running sessions
    const { data: activeLive } = useGetActiveLiveSessionQuery(undefined, {
        pollingInterval: 5000,
        refetchOnFocus: true,
    });

    const activeElapsedMinutes = activeLive?.session?.elapsedSeconds ? Math.floor(activeLive.session.elapsedSeconds / 60) : 0;
    const totalHours = Math.round(( ( (stats?.totalMinutes ?? 0) + activeElapsedMinutes ) / 60 ) * 100) / 100 || totalHoursRaw;
    const dailyGoalHours = stats?.dailyGoalHours ?? 4; // fallback to 4h if not set
    const normalizedGoalHours = dailyGoalHours > 0 ? dailyGoalHours : 4;
    const progress = Math.min(100, Math.round((totalHours / normalizedGoalHours) * 100));

    // Focus Score
    const focusScore = focusScoreData?.stats?.score ?? 0;

    // Streak
    const currentStreak = streakData?.streak ?? 0;
    const activeDates = streakData?.activeDates || [];

    // Normalize activeDates provided by the API into a Set of YYYY-MM-DD keys
    const activeDateSet = new Set<string>(
        (activeDates || []).map((d: string | number | Date | Record<string, unknown>) => {
            if (d && d instanceof Date) {
                return Number.isNaN(d.getTime()) ? '' : toLocalDateKey(d);
            }

            if (typeof d === 'string') {
                const trimmed = d.trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
                const norm = normalizeDateInput(trimmed);
                if (norm) return norm;
                const parsed = new Date(trimmed);
                return Number.isNaN(parsed.getTime()) ? '' : toLocalDateKey(parsed);
            }

            if (typeof d === 'number') {
                const parsed = new Date(d);
                return Number.isNaN(parsed.getTime()) ? '' : toLocalDateKey(parsed);
            }

            if (d && typeof d === 'object') {
                const value = (d as Record<string, unknown>).date
                    ?? (d as Record<string, unknown>).day
                    ?? (d as Record<string, unknown>).value;
                if (typeof value === 'string' || typeof value === 'number') {
                    const norm = normalizeDateInput(String(value));
                    if (norm) return norm;
                    const parsed = new Date(value);
                    return Number.isNaN(parsed.getTime()) ? '' : toLocalDateKey(parsed);
                }
            }

            return '';
        }).filter(Boolean)
    );

    // Helper to check if a date (relative to today) was active
    const isActiveDate = (daysAgo: number) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const key = toLocalDateKey(date);
        return activeDateSet.has(key);
    };
    const scoreBreakdown = [
        {
            label: 'Consistency',
            value: focusScoreData?.stats?.breakdown?.consistency || 0,
            max: 40,
            textColor: 'text-indigo-400',
            barColor: 'bg-indigo-500',
        },
        {
            label: 'Intensity',
            value: focusScoreData?.stats?.breakdown?.intensity || 0,
            max: 30,
            textColor: 'text-pink-400',
            barColor: 'bg-pink-500',
        },
        {
            label: 'Depth',
            value: focusScoreData?.stats?.breakdown?.depth || 0,
            max: 30,
            textColor: 'text-purple-400',
            barColor: 'bg-purple-500',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Daily Goal</div>
                        <div className="text-3xl font-bold">
                            {isSummaryLoading ? (
                                <Skeleton className="h-9 w-24" />
                            ) : (
                                `${totalHours}h / ${normalizedGoalHours}h`
                            )}
                        </div>
                    </div>
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="6"
                            />
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="url(#gradient1)"
                                strokeWidth="6"
                                strokeDasharray={`${(progress / 100) * 176} 176`}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                                    <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Target className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                </div>
                <div className="text-sm font-semibold text-purple-400">
                    {isSummaryLoading ? <Skeleton className="h-4 w-20" /> : `${progress}% Complete`}
                </div>
            </div>

            <div className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Focus Score</div>
                        <div className="text-3xl font-bold">{isFocusLoading ? <Skeleton className="h-9 w-12" /> : focusScore}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-sm text-slate-400">Past 7 Days</div>
                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-semibold text-green-400">
                            {isFocusLoading ? <Skeleton className="h-4 w-16" /> : (focusScore > 80 ? "Excellent" : focusScore > 60 ? "Good" : "Keep going")}
                        </span>
                    </div>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${focusScore}%` }}
                    ></div>
                </div>

                {/* Score Breakdown Overlay */}
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md p-6 flex flex-col justify-center gap-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Focus Breakdown</div>
                    <div className="space-y-2">
                        {scoreBreakdown.map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">{item.label}</span>
                                    <span className={`font-mono ${item.textColor} font-bold`}>{item.value}/{item.max}</span>
                                </div>
                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.barColor}`} style={{ width: `${(item.value / item.max) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Active Streak</div>
                        <div className="text-3xl font-bold">{isStreakLoading ? <Skeleton className="h-9 w-12" /> : currentStreak}</div>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${currentStreak > 0 ? "from-orange-500 to-red-500" : "from-slate-700 to-slate-800"}`}>
                        <Flame className={`w-6 h-6 ${currentStreak > 0 ? "text-white" : "text-slate-500"}`} />
                    </div>
                </div>
                <div className="text-sm text-slate-400 mb-2">Days in a row</div>
                <div className="flex gap-1.5">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-2 rounded-sm transition-all duration-500 ${isActiveDate(13 - i)
                                ? 'bg-gradient-to-t from-orange-500 to-yellow-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                                : 'bg-white/5'
                                }`}
                            title={new Date(Date.now() - (13 - i) * 86400000).toDateString()}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
}
