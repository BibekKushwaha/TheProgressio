'use client';

import { DailyStats, useGetDailySummaryQuery, SessionType } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

interface SessionBreakdownProps {
    pastDays: string;
    summaryStats?: DailyStats;
    isLoading?: boolean;
}

export function SessionBreakdown({ pastDays, summaryStats, isLoading: prefetchedLoading }: SessionBreakdownProps) {
    // Daily summary updates via tag invalidation on session log.
    const { data: summaryData, isLoading: queryLoading } = useGetDailySummaryQuery(
        pastDays,
        { refetchOnFocus: false, skip: Boolean(summaryStats) }
    );

    const colors: Record<SessionType, string> = {
        [SessionType.DEEP_WORK]: 'rgb(6, 182, 212)', // Cyan
        [SessionType.POMODORO]: 'rgb(168, 85, 247)',  // Purple
        [SessionType.BREAK]: 'rgb(34, 197, 94)',      // Green
    };

    const typeLabels: Record<SessionType, string> = {
        [SessionType.DEEP_WORK]: 'Deep Work',
        [SessionType.POMODORO]: 'Pomodoro',
        [SessionType.BREAK]: 'Break',
    };

    const stats = summaryStats || summaryData?.stats;
    const isLoading = prefetchedLoading ?? queryLoading;
    const rawBreakdown = stats?.breakdown || [];
    let currentOffset = 0;

    const segments = rawBreakdown.map(item => {
        const segment = {
            label: typeLabels[item.type] || item.type,
            percentage: item.percentage,
            color: colors[item.type] || 'rgb(100, 116, 139)',
            offset: currentOffset
        };
        currentOffset += item.percentage;
        return segment;
    });

    const radius = 80;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Session Breakdown</h2>
                <p className="text-xs text-slate-400 capitalize">{pastDays === "7" ? "Weekly" : "Daily"}</p>
            </div>

            <div className="flex flex-col items-center">
                <div className="relative w-64 h-64 mb-6">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Skeleton className="w-full h-full rounded-full bg-white/5" />
                        </div>
                    ) : (
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                            {segments.length > 0 ? segments.map((segment) => {
                                const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
                                const strokeDashoffset = -((segment.offset / 100) * circumference);

                                return (
                                    <circle
                                        key={segment.label}
                                        cx="100"
                                        cy="100"
                                        r={radius}
                                        fill="none"
                                        stroke={segment.color}
                                        strokeWidth="20"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                        className="transition-all duration-300 hover:opacity-80"
                                    />
                                );
                            }) : (
                                <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="20" />
                            )}

                            <circle
                                cx="100"
                                cy="100"
                                r="60"
                                fill="rgba(0, 0, 0, 0.5)"
                                className="backdrop-blur-sm"
                            />
                        </svg>
                    )}

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-4xl font-bold">{stats?.totalHours || 0}h</div>
                        <div className="text-sm text-slate-400">Total</div>
                    </div>
                </div>

                <div className="w-full space-y-3">
                    {segments.map((segment) => (
                        <div key={segment.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: segment.color }}
                                ></div>
                                <span className="text-sm text-slate-300">{segment.label}</span>
                            </div>
                            <span className="text-sm font-semibold">{segment.percentage}%</span>
                        </div>
                    ))}
                    {segments.length === 0 && !isLoading && (
                        <p className="text-center text-sm text-slate-500 italic">No session data for this period</p>
                    )}
                </div>
            </div>
        </div>
    );
}
