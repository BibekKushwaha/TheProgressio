// components/analytics/StatCards.tsx
import { Clock, CheckCircle, Target, TrendingUp } from 'lucide-react';
import { useGetDailySummaryQuery, useGetFocusScoreQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsCard } from './AnalyticsCard';

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
                <AnalyticsCard
                    key={stat.label}
                    title={String(stat.value)}
                    description={stat.label}
                    icon={stat.icon}
                    iconColor="text-white"
                    iconBgColor={`bg-gradient-to-br ${stat.gradient}`}
                    className="p-6" // Override padding if needed, though default is p-6
                >
                    <div className="absolute top-6 right-6">
                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-semibold text-green-400">
                            {stat.trend}
                        </span>
                    </div>
                </AnalyticsCard>
            ))}
        </div>
    );
}