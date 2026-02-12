// components/analytics/StatCards.tsx
import { Clock, CheckCircle, Target, TrendingUp } from 'lucide-react';

import { useGetDailySummaryQuery, useGetFocusScoreQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

export function StatCards({ pastDays }: { pastDays: string }) {
    const { data: summaryData, isLoading: isSummaryLoading } = useGetDailySummaryQuery(pastDays);
    const { data: focusScoreData, isLoading: isFocusLoading } = useGetFocusScoreQuery();

    const isWeekly = pastDays === "7";
    const timeLabel = isWeekly ? 'Weekly Focus' : 'Today\'s Focus';

    const stats = [
        {
            label: `${timeLabel} Time`,
            value: isSummaryLoading ? <Skeleton className="h-8 w-16" /> : `${summaryData?.stats?.totalHours ?? 0}h`,
            trend: '+12%',
            icon: Clock,
            gradient: 'from-cyan-500 to-blue-500',
        },
        {
            label: `${timeLabel} Minutes`,
            value: isSummaryLoading ? <Skeleton className="h-8 w-20" /> : `${summaryData?.stats?.totalMinutes ?? 0}m`,
            trend: '+2',
            icon: CheckCircle,
            gradient: 'from-purple-500 to-pink-500',
        },
        {
            label: 'Overall Focus Score',
            value: isFocusLoading ? <Skeleton className="h-8 w-24" /> : `${focusScoreData?.stats?.score ?? 0} / 100`,
            trend: '+5pts',
            icon: Target,
            gradient: 'from-green-500 to-emerald-500',
        },
        {
            label: `${isWeekly ? 'Weekly' : 'Daily'} Goal Progress`,
            value: isSummaryLoading ? <Skeleton className="h-8 w-16" /> : `${Math.round(((summaryData?.stats?.totalHours || 0) / (summaryData?.stats?.dailyGoalHours || 1)) * 100)}%`,
            trend: 'Target',
            icon: TrendingUp,
            gradient: 'from-orange-500 to-red-500',
        },

    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-semibold text-green-400">
                            {stat.trend}
                        </span>
                    </div>
                    <div className="text-sm text-slate-400 mb-2">{stat.label}</div>
                    <div className="text-3xl font-bold">{stat.value}</div>
                </div>
            ))}
        </div>
    );
}
