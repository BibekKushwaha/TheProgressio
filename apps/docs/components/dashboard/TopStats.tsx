"use client";

import { useId } from 'react';
import { Target, Flame, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import Link from 'next/link';

export function TopStats() {
    const gradientId = useId().replace(/:/g, '');
    const {
        isSummaryLoading,
        isFocusLoading,
        hasCardError,
        totalHours,
        dailyGoalHours,
        progress,
        displayFocusScore,
        focusScoreNumeric,
        focusStatus,
        scoreBreakdown,
        currentStreak,
        historyDots,
    } = useDashboardStats();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Daily Goal Card */}
            <Link href="/analytics" className="block h-full">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="text-sm text-slate-400 mb-1">Daily Goal</div>
                            <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                                {isSummaryLoading ? (
                                    <Skeleton className="h-9 w-24" />
                                ) : (
                                    `${totalHours}h / ${dailyGoalHours}h`
                                )}
                            </div>
                        </div>
                        <div className="relative w-16 h-16">
                            <svg
                                className="w-full h-full -rotate-90"
                                viewBox="0 0 64 64"
                                role="img"
                                aria-label={`Daily goal progress: ${progress}% complete`}
                            >
                                <circle
                                    cx="32" cy="32" r="28"
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.1)"
                                    strokeWidth="6"
                                />
                                <circle
                                    cx="32" cy="32" r="28"
                                    fill="none"
                                    stroke={`url(#${gradientId})`}
                                    strokeWidth="6"
                                    strokeDasharray={`${(progress / 100) * 175.9} 175.9`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                                <defs>
                                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="rgba(190, 142, 236, 1)" />
                                        <stop offset="100%" stopColor="rgba(72, 99, 236, 1)" />
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
                    {hasCardError ? (
                        <div className="mt-2 text-xs text-amber-300">Some stats are temporarily unavailable.</div>
                    ) : null}
                    <ChevronRight className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </Link>

            {/* Focus Score Card */}
            <Link href="/analytics/strategic" className="block h-full">
                <div className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="text-sm text-slate-400 mb-1">Focus Score</div>
                            <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
                                {isFocusLoading ? <Skeleton className="h-9 w-12" /> : displayFocusScore}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className="text-sm text-slate-400">Current Level</div>
                            <span className={`px-3 py-1 ${focusStatus.bg} border ${focusStatus.border} rounded-full text-xs font-semibold ${focusStatus.color}`}>
                                {isFocusLoading ? <Skeleton className="h-4 w-16" /> : focusStatus.label}
                            </span>
                        </div>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${focusScoreNumeric}%` }}
                        />
                    </div>

                    {/* Score Breakdown Overlay */}
                    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col justify-center gap-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Performance Details</div>
                        <div className="space-y-3">
                            {scoreBreakdown.map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between items-center text-xs mb-1">
                                        <span className="text-slate-300">{item.label}</span>
                                        <span className={`font-mono ${item.textColor} font-bold`}>{item.value}/{item.max}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${item.barColor} transition-all duration-700 delay-100`}
                                            style={{ width: `${item.max > 0 ? Math.min(100, (item.value / item.max) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Link>

            {/* Streak Card */}
            <Link href="/habits" className="block h-full">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="text-sm text-slate-400 mb-1">Active Streak</div>
                            <div className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                                {isFocusLoading ? <Skeleton className="h-9 w-12" /> : currentStreak}
                            </div>
                        </div>
                        <div className={`p-3 rounded-xl bg-gradient-to-br transition-all duration-500 ${currentStreak > 0 ? 'from-orange-500 to-red-500 shadow-lg shadow-orange-500/20' : 'from-slate-700 to-slate-800'}`}>
                            <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                    </div>
                    <div className="text-sm text-slate-400 mb-3">Activity History (14d)</div>
                    <div className="flex gap-1.5">
                        {historyDots.map((dot) => (
                            <div
                                key={dot.dateKey}
                                className={`flex-1 h-3 rounded-sm transition-all duration-500 ${dot.isActive
                                    ? 'bg-gradient-to-t from-orange-500 to-yellow-400 shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                                    : 'bg-white/5'
                                    }`}
                                title={`${dot.label}: ${dot.isActive ? 'Active' : 'No activity'}`}
                            />
                        ))}
                    </div>
                    <ChevronRight className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </Link>
        </div>
    );
}
