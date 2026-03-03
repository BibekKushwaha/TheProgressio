"use client";
import { useGetWeeklyTrendsQuery } from '@repo/store';
import { useTaskRouteId } from '@/hooks/useTaskRouteId';
import { getDebugRefetchOptions } from '@/lib/refetchDebug';

export function FocusHistory() {
    const taskId = useTaskRouteId();
    // A task's weekly history changes only when a new session is logged.
    const { data: trendsData, isLoading } = useGetWeeklyTrendsQuery(
        taskId || '',
        {
            skip: !taskId,
            ...getDebugRefetchOptions('focusHistory.weeklyTrends', 300000),
        }
    );

    const days = (trendsData?.data || []).map((d) => {
        const date = new Date(d.date);
        const today = new Date();
        return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            minutes: d.minutes || 0,
            isToday: date.toDateString() === today.toDateString(),
        };
    });

    const maxMinutes = days.reduce((acc, d) => Math.max(acc, d.minutes), 60); // Min 60 for scale

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Focus History</h2>

            {isLoading ? (
                <div className="flex items-center justify-center h-32 text-slate-500">
                    Loading history...
                </div>
            ) : days.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-slate-500 italic text-sm">
                    No focus history yet
                </div>
            ) : (
                <div className="flex items-end justify-between gap-2 h-32">
                    {days.map((day) => {
                        const height = day.minutes > 0 ? (day.minutes / maxMinutes) * 100 : 5;

                        return (
                            <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                                <div className="relative w-full flex items-end justify-center h-24">
                                    <div
                                        className={`w-full rounded-t-lg transition-all duration-300 ${day.isToday
                                            ? 'bg-gradient-to-t from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/50'
                                            : day.minutes > 0
                                                ? 'bg-gradient-to-t from-indigo-600/60 to-purple-600/60'
                                                : 'bg-white/10'
                                            }`}
                                        style={{ height: `${height}%` }}
                                    >
                                        {day.minutes > 0 && (
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-indigo-300">
                                                {day.minutes}m
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className={`text-xs ${day.isToday ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
                                    {day.day}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
