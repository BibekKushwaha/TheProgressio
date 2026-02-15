'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export type HeatmapDataPoint = {
    date: string;
    value: number;
    intensity: 0 | 1 | 2 | 3 | 4;
};

export type HeatmapColorTheme = 'emerald' | 'cyan';

interface GenericHeatmapProps {
    title?: React.ReactNode;
    data: HeatmapDataPoint[];
    isLoading?: boolean;
    colorTheme?: HeatmapColorTheme;
    summary?: React.ReactNode;
    emptyMessage?: string;
    reverseOrder?: boolean; // If true, newest weeks are on the left
    className?: string;     // Wrapper class
    height?: string;        // Optional fixed height
}

export function GenericHeatmap({
    title,
    data,
    isLoading,
    colorTheme = 'emerald',
    summary,
    emptyMessage = 'No activity data available.',
    reverseOrder = false,
    className,
    height
}: GenericHeatmapProps) {
    const [hoveredDay, setHoveredDay] = useState<HeatmapDataPoint | null>(null);

    const parseDate = (date: string) => new Date(`${date}T00:00:00`);
    const weekdayIndexMonFirst = (day: number) => (day === 0 ? 6 : day - 1);

    const sortedDays = useMemo(
        () => [...data].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()),
        [data]
    );

    const weeks = useMemo(() => {
        if (sortedDays.length === 0) return [] as Array<Array<HeatmapDataPoint | null>>;

        const firstDayIndex = weekdayIndexMonFirst(parseDate(sortedDays[0]!.date).getDay());
        const paddedDays: Array<HeatmapDataPoint | null> = [
            ...Array.from({ length: firstDayIndex }, () => null),
            ...sortedDays,
        ];

        while (paddedDays.length % 7 !== 0) {
            paddedDays.push(null);
        }

        const result: Array<Array<HeatmapDataPoint | null>> = [];
        for (let i = 0; i < paddedDays.length; i += 7) {
            result.push(paddedDays.slice(i, i + 7));
        }
        return result;
    }, [sortedDays]);

    const displayWeeks = useMemo(() => {
        return reverseOrder ? [...weeks].reverse() : [...weeks];
    }, [weeks, reverseOrder]);

    const monthHeaders = useMemo(() => {
        const headers: Array<{ weekIndex: number; label: string }> = [];
        let previousMonth: number | null = null;

        displayWeeks.forEach((week, weekIndex) => {
            // Find first non-null day in this week column
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
    }, [displayWeeks]);

    const getColor = (intensity: number) => {
        if (colorTheme === 'cyan') {
            const colors = [
                'bg-white/5 border border-white/5',
                'bg-cyan-900/40 border-cyan-500/20',
                'bg-cyan-700/60 border-cyan-500/30',
                'bg-cyan-500/80 border-cyan-400/50',
                'bg-cyan-400 border-cyan-300',
            ];
            return colors[intensity] || colors[0];
        }

        // Default Emerald
        const colors = [
            'bg-white/5 border border-white/5',
            'bg-emerald-900/60 border border-emerald-600/20',
            'bg-emerald-700/70 border border-emerald-500/30',
            'bg-emerald-500/80 border border-emerald-300/40',
            'bg-emerald-400 border border-emerald-200/60',
        ];
        return colors[intensity] || colors[0];
    };

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (isLoading) {
        return (
            <div className={cn("bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6 animate-pulse", className)}>
                <div className="h-6 bg-white/10 rounded w-52 mb-4" />
                <div className="h-40 bg-white/5 rounded-xl mb-4" />
            </div>
        );
    }

    if (sortedDays.length === 0) {
        return (
            <div className={cn("bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6", className)}>
                {title}
                <p className="text-sm text-slate-400 mt-2">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6", className, height)}>
            {/* Background Decor */}
            <div className={cn(
                "absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl pointer-events-none",
                colorTheme === 'cyan' ? 'bg-cyan-400/10' : 'bg-emerald-400/10'
            )} />

            {/* Header */}
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <div>
                    {title}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Less</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className={`w-3 h-3 rounded-sm ${getColor(level)}`}
                        />
                    ))}
                    <span className="text-xs text-slate-500">More</span>
                </div>
            </div>

            {/* Optional Summary Info */}
            {summary && (
                <div className="relative mb-5">
                    {summary}
                </div>
            )}

            {/* Heatmap Grid */}
            <div className="relative w-full overflow-x-auto pb-2">
                <div className="inline-flex gap-[4px] min-w-max">
                    {/* Day labels column */}
                    <div className="flex flex-col gap-[4px] mr-1 mt-5">
                        {dayLabels.map((label, i) => (
                            <div key={i} className="h-3.5 flex items-center">
                                <span className="text-[10px] text-slate-500 w-7">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Weeks columns */}
                    {displayWeeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-[4px]">
                            {/* Month Header for this column */}
                            <div className="h-4 mb-1 flex items-center justify-center">
                                {monthHeaders.find((header) => header.weekIndex === weekIdx) ? (
                                    <span className="text-[10px] text-slate-500">
                                        {monthHeaders.find((header) => header.weekIndex === weekIdx)?.label}
                                    </span>
                                ) : null}
                            </div>

                            {/* Days in week */}
                            {week.map((day, dayIdx) => {
                                if (!day) {
                                    return <div key={`empty-${dayIdx}`} className="w-3.5 h-3.5" />;
                                }

                                return (
                                    <div
                                        key={day.date}
                                        className={cn(
                                            "w-3.5 h-3.5 rounded-[3px] transition-all cursor-pointer hover:scale-110 hover:ring-1",
                                            getColor(day.intensity),
                                            colorTheme === 'cyan' ? 'hover:ring-cyan-300/60' : 'hover:ring-emerald-300/60'
                                        )}
                                        onMouseEnter={() => setHoveredDay(day)}
                                        onMouseLeave={() => setHoveredDay(null)}
                                        title={`${day.date}: ${day.value}`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tooltip / Status Footer */}
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
                        {hoveredDay.value} {colorTheme === 'emerald' ? 'contributions' : 'minutes'}
                    </span>
                ) : (
                    <span className="text-slate-400">Hover any cell to view day details</span>
                )}
            </div>
        </div>
    );
}
