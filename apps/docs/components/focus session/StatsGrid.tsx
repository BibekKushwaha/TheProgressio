// components/focus-session/StatsGrid.tsx
import { Star, CheckCircle2, Target, Flame } from 'lucide-react';
import { useGetDailySummaryQuery, useGetFocusScoreQuery, useGetUserStreakQuery } from '@repo/store';

interface StatsGridProps {
    taskTitle?: string;
}

export function StatsGrid({ taskTitle }: StatsGridProps = {}) {
    const { data: summaryData } = useGetDailySummaryQuery('1');
    const { data: focusData } = useGetFocusScoreQuery();
    const { data: streakData } = useGetUserStreakQuery();

    const focusScore = focusData?.stats?.score ?? 0;
    const dailyHours = summaryData?.stats?.totalHours ?? 0;
    const dailyGoal = summaryData?.stats?.dailyGoalHours ?? 4;
    const goalProgress = dailyGoal > 0 ? Math.min(100, Math.round((dailyHours / dailyGoal) * 100)) : 0;
    const streak = streakData?.streak ?? 0;
    const tasksCompleted = summaryData?.stats?.totalTasksCompleted ?? 0;

    const stats = [
        {
            id: 1,
            title: 'Focus Quality',
            value: `${focusScore}%`,
            subtitle: focusScore >= 80 ? 'Excellent focus today' : 'Keep improving!',
            icon: Star,
            color: 'yellow',
        },
        {
            id: 2,
            title: 'Tasks Finished',
            value: taskTitle || `${tasksCompleted} tasks`,
            subtitle: tasksCompleted > 0 ? `${tasksCompleted} completed today` : 'No tasks yet',
            icon: CheckCircle2,
            color: 'green',
        },
        {
            id: 3,
            title: 'Daily Goal',
            value: `${dailyHours}h`,
            subtitle: `of ${dailyGoal}h target`,
            progress: goalProgress,
            icon: Target,
            color: 'blue',
        },
        {
            id: 4,
            title: 'Total Streak',
            value: `${streak} Days`,
            subtitle: streak > 0 ? "Don't break the chain!" : 'Start your streak today!',
            icon: Flame,
            color: 'orange',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
                <div
                    key={stat.id}
                    className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="text-sm text-slate-400">{stat.title}</div>
                        <stat.icon className={`w-5 h-5 ${stat.color === 'yellow' ? 'text-yellow-400' :
                            stat.color === 'green' ? 'text-green-400' :
                                stat.color === 'orange' ? 'text-orange-400' :
                                    'text-blue-400'
                            }`} />
                    </div>

                    <div className="text-3xl font-bold mb-2">{stat.value}</div>
                    <div className="text-sm text-slate-400">{stat.subtitle}</div>

                    {stat.progress !== undefined && (
                        <div className="mt-4 flex items-center gap-4">
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
                                        stroke="rgb(99, 102, 241)"
                                        strokeWidth="6"
                                        strokeDasharray={`${(stat.progress / 100) * 176} 176`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                    {stat.progress}%
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}