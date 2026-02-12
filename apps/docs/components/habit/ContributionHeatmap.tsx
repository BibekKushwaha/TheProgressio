'use client';

import { useMemo, useState } from 'react';
import { useGetContributionHeatmapQuery } from '@repo/store';
import { Activity, CalendarDays, Sparkles } from 'lucide-react';

type HeatmapDay = {
    date: string;
    count: number;
    intensity: 0 | 1 | 2 | 3 | 4;
};

export function ContributionHeatmap() {
    const { data, isLoading } = useGetContributionHeatmapQuery();
    const summary = data?.summary;
    const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

    const parseDate = (date: string) => new Date(`${date}T00:00:00`);
    const weekdayIndexMonFirst = (day: number) => (day === 0 ? 6 : day - 1);
    const rawHeatmap = useMemo(() => (data?.heatmap ?? []) as HeatmapDay[], [data?.heatmap]);

    const sortedDays = useMemo(
        () => [...rawHeatmap].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()),
        [rawHeatmap]
    );

    const weeks = useMemo(() => {
        if (sortedDays.length === 0) return [] as Array<Array<HeatmapDay | null>>;

        const firstDayIndex = weekdayIndexMonFirst(parseDate(sortedDays[0]!.date).getDay());
        const paddedDays: Array<HeatmapDay | null> = [
            ...Array.from({ length: firstDayIndex }, () => null),
            ...sortedDays,
        ];

        while (paddedDays.length % 7 !== 0) {
            paddedDays.push(null);
        }

        const result: Array<Array<HeatmapDay | null>> = [];
        for (let i = 0; i < paddedDays.length; i += 7) {
            result.push(paddedDays.slice(i, i + 7));
        }
        return result;
    }, [sortedDays]);

    const monthHeaders = useMemo(() => {
        const headers: Array<{ weekIndex: number; label: string }> = [];
        let previousMonth: number | null = null;

        weeks.forEach((week, weekIndex) => {
            const firstRealDay = week.find((day) => day !== null);
            if (!firstRealDay) return;

            const date = parseDate(firstRealDay.date);
            const month = date.getMonth();
            if (previousMonth !== month) {
                headers.push({
                    weekIndex,
                    label: date.toLocaleDateString('en-US', { month: 'short' }),
                });
                previousMonth = month;
            }
        });

        return headers;
    }, [weeks]);

    const getColor = (intensity: 0 | 1 | 2 | 3 | 4) => {
        const colors: Record<number, string> = {
            0: 'bg-slate-800/60 border border-white/5',
            1: 'bg-emerald-900/60 border border-emerald-600/20',
            2: 'bg-emerald-700/70 border border-emerald-500/30',
            3: 'bg-emerald-500/80 border border-emerald-300/40',
            4: 'bg-emerald-400 border border-emerald-200/60',
        };
        return colors[intensity] ?? 'bg-slate-800/50';
    };

    const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/[0.06] via-cyan-500/[0.03] to-white/[0.02] border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-52 mb-4" />
                <div className="h-16 bg-white/5 rounded-xl mb-4" />
                <div className="h-32 bg-white/5 rounded-xl" />
            </div>
        );
    }

    if (sortedDays.length === 0) {
        return (
            <div className="bg-gradient-to-br from-white/[0.06] via-cyan-500/[0.03] to-white/[0.02] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white">Contribution Heatmap</h2>
                <p className="text-sm text-slate-400 mt-2">No activity yet. Complete habits to build your map.</p>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.06] via-cyan-500/[0.03] to-white/[0.02] border border-white/10 rounded-2xl p-6">
            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-300" />
                        Contribution Heatmap
                    </h2>
                    {summary && (
                        <p className="text-sm text-slate-400 mt-0.5">
                            Last 365 days of your habit activity
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Low</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className={`w-3 h-3 rounded-sm ${getColor(level as 0 | 1 | 2 | 3 | 4)}`}
                        />
                    ))}
                    <span className="text-xs text-slate-500">High</span>
                </div>
            </div>

            {summary ? (
                <div className="relative mb-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Activity className="w-3.5 h-3.5 text-emerald-300" />
                            Contributions
                        </div>
                        <p className="mt-1 text-lg font-semibold text-white">{summary.totalContributions}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <CalendarDays className="w-3.5 h-3.5 text-cyan-300" />
                            Active Days
                        </div>
                        <p className="mt-1 text-lg font-semibold text-white">{summary.activeDays}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-xs text-slate-400">Consistency</div>
                        <p className="mt-1 text-lg font-semibold text-white">{summary.consistencyRate}%</p>
                    </div>
                </div>
            ) : null}

            <div className="relative overflow-x-auto pb-2">
                <div className="inline-flex gap-[4px] min-w-max">
                    {/* Day labels */}
                    <div className="flex flex-col gap-[4px] mr-1 mt-5">
                        {dayLabels.map((label, i) => (
                            <div key={i} className="h-3.5 flex items-center">
                                <span className="text-[10px] text-slate-500 w-7">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Heatmap grid */}
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-[4px]">
                            <div className="h-4 mb-1 flex items-center">
                                {monthHeaders.find((header) => header.weekIndex === weekIdx) ? (
                                    <span className="text-[10px] text-slate-500">
                                        {monthHeaders.find((header) => header.weekIndex === weekIdx)?.label}
                                    </span>
                                ) : null}
                            </div>
                            {week.map((day, dayIdx) => {
                                if (!day) {
                                    return <div key={`empty-${dayIdx}`} className="w-3.5 h-3.5" />;
                                }

                                return (
                                    <button
                                        key={day.date}
                                        type="button"
                                        className={`w-3.5 h-3.5 rounded-[3px] ${getColor(day.intensity)} hover:scale-110 hover:ring-1 hover:ring-cyan-300/60 transition-all cursor-pointer`}
                                        onMouseEnter={() => setHoveredDay(day)}
                                        onMouseLeave={() => setHoveredDay(null)}
                                        title={`${day.date}: ${day.count} contributions`}
                                        aria-label={`${day.date}: ${day.count} contributions`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 min-h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                {hoveredDay ? (
                    <span>
                        <span className="text-white font-medium">
                            {parseDate(hoveredDay.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </span>
                        {' • '}
                        {hoveredDay.count} contribution{hoveredDay.count === 1 ? '' : 's'}
                    </span>
                ) : (
                    <span className="text-slate-400">Hover any cell to view day details</span>
                )}
            </div>
        </div>
    );
}
