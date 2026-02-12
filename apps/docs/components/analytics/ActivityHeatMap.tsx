// components/analytics/ActivityHeatmap.tsx
import { useGetWeeklyTrendsQuery } from '@repo/store';
import { useMemo } from 'react';
import { toLocalDateKey } from '@/lib/date';

export function ActivityHeatmap({ pastDays }: { pastDays: string }) {
    const weeks = pastDays === "7" ? 24 : 12;
    const daysPerWeek = 7;

    const { data: trendsResponse } = useGetWeeklyTrendsQuery();
    const trendsByDate = useMemo(() => {
        const map = new Map<string, number>();
        if (trendsResponse?.data) {
            for (const entry of trendsResponse.data) {
                const parsed = new Date(entry.date);
                const key = Number.isNaN(parsed.getTime())
                    ? entry.date
                    : toLocalDateKey(parsed);
                map.set(key, entry.minutes ?? 0);
            }
        }
        return map;
    }, [trendsResponse]);

    const heatmapDataByCell = useMemo(() => {
        const today = new Date();
        const map = new Map<string, { date: string; minutes: number; intensity: number }>();
        for (let week = 0; week < weeks; week++) {
            for (let day = 0; day < daysPerWeek; day++) {
                const daysAgo = (weeks - 1 - week) * 7 + (6 - day);
                const cellDate = new Date(today);
                cellDate.setDate(today.getDate() - daysAgo);
                const dateKey = toLocalDateKey(cellDate);
                const minutes = trendsByDate.get(dateKey) ?? 0;
                // Map minutes to 0-4 intensity: 0=none, 1=<30m, 2=<60m, 3=<120m, 4=120m+
                const intensity = minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 120 ? 3 : 4;
                map.set(`${week}-${day}`, { date: dateKey, minutes, intensity });
            }
        }
        return map;
    }, [trendsByDate, weeks]);

    const getColor = (intensity: number) => {
        const colors = [
            'bg-slate-800/50',
            'bg-cyan-900/40',
            'bg-cyan-700/60',
            'bg-cyan-500/80',
            'bg-cyan-400',
        ];
        return colors[intensity];
    };

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Activity Heatmap</h2>
                <p className="text-xs text-slate-400">
                    {pastDays === "7" ? '24-week activity view' : '12-week activity view'}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Less</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className={`w-4 h-4 rounded ${getColor(level)}`}
                        ></div>
                    ))}
                    <span className="text-xs text-slate-400">More</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <div className="inline-flex gap-1">
                    <div className="flex flex-col gap-1 mr-2">
                        <div className="h-4"></div>
                        {days.map((day, index) => (
                            <div key={day} className="h-4 flex items-center">
                                {index % 2 === 0 && (
                                    <span className="text-xs text-slate-400 w-8">{day}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {Array.from({ length: weeks }).map((_, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1">
                            {weekIndex % 4 === 0 && (
                                <div className="h-4 flex items-center justify-center">
                                    <span className="text-xs text-slate-400">
                                        {new Date(Date.now() - (weeks - weekIndex) * 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short' })}
                                    </span>
                                </div>
                            )}
                            {!weekIndex || weekIndex % 4 !== 0 ? <div className="h-4"></div> : null}
                            {Array.from({ length: daysPerWeek }).map((_, dayIndex) => {
                                const dataPoint = heatmapDataByCell.get(`${weekIndex}-${dayIndex}`);
                                return (
                                    <div
                                        key={`${weekIndex}-${dayIndex}`}
                                        className={`w-4 h-4 rounded ${getColor(dataPoint?.intensity || 0)} hover:ring-2 hover:ring-cyan-400 transition-all cursor-pointer`}
                                        title={`${dataPoint?.date || 'No date'} • ${dataPoint?.minutes || 0} min`}
                                    ></div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
