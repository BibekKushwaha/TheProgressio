'use client';

import { useGetContributionHeatmapQuery } from '@repo/store';
import { Activity, CalendarDays, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { HeatmapDataPoint } from '../analytics/GenericHeatmap';

function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function buildYearRange(year: number): string[] {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const days: string[] = [];
    const current = new Date(start);
    while (current <= end) {
        days.push(formatDateKey(current));
        current.setDate(current.getDate() + 1);
    }
    return days;
}

function computeIntensity(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
    if (!value || max <= 0) return 0;
    const ratio = value / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

function weekdayIndexMonFirst(day: number): number {
    return day === 0 ? 6 : day - 1;
}

function getEmeraldColor(intensity: number): string {
    const colors = [
        'bg-white/5 border border-white/5',
        'bg-emerald-900/60 border border-emerald-600/20',
        'bg-emerald-700/70 border border-emerald-500/30',
        'bg-emerald-500/80 border border-emerald-300/40',
        'bg-emerald-400 border border-emerald-200/60',
    ];
    return colors[intensity] || colors[0] || 'bg-white/5 border border-white/5';
}

function buildMonthGrid(year: number, monthIndex: number, byDate: Map<string, HeatmapDataPoint>): Array<Array<HeatmapDataPoint | null>> {
    const first = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const firstDayOffset = weekdayIndexMonFirst(first.getDay());
    const padded: Array<HeatmapDataPoint | null> = [
        ...Array.from({ length: firstDayOffset }, () => null),
    ];

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = formatDateKey(new Date(year, monthIndex, day));
        padded.push(byDate.get(dateKey) ?? { date: dateKey, value: 0, intensity: 0 });
    }

    while (padded.length % 7 !== 0) padded.push(null);

    const weeks: Array<Array<HeatmapDataPoint | null>> = [];
    for (let i = 0; i < padded.length; i += 7) {
        weeks.push(padded.slice(i, i + 7));
    }
    return weeks;
}

export function ContributionHeatmap() {
    const { data, isLoading } = useGetContributionHeatmapQuery();
    const summary = data?.summary;
    const [hoveredDay, setHoveredDay] = useState<HeatmapDataPoint | null>(null);

    const { year, byDate, maxValue, totalPoints } = useMemo(() => {
        const year = new Date().getFullYear();
        const rows = data?.heatmap ?? [];

        const byDate = new Map<string, HeatmapDataPoint>();
        for (const row of rows) {
            const d = row as { date: string; count: number };
            if (!d?.date) continue;
            if (d.date.startsWith(`${year}-`)) {
                const value = Number(d.count) || 0;
                byDate.set(d.date, { date: d.date, value, intensity: 0 });
            }
        }

        const max = Math.max(0, ...Array.from(byDate.values()).map((p) => p.value));
        for (const entry of byDate.values()) {
            entry.intensity = computeIntensity(entry.value, max);
        }

        const totalPoints = buildYearRange(year).length;
        return { year, byDate, maxValue: max, totalPoints };
    }, [data?.heatmap]);

    const monthWeeks = useMemo(() => {
        return Array.from({ length: 12 }, (_, monthIndex) => buildMonthGrid(year, monthIndex, byDate));
    }, [byDate, year]);

    const summaryNode = summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
    ) : null;

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-52 mb-4" />
                <div className="h-40 bg-white/5 rounded-xl mb-4" />
            </div>
        );
    }

    if (totalPoints === 0) {
        return (
            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                    Contribution Heatmap
                </h2>
                <p className="text-sm text-slate-400 mt-2">No activity yet. Complete habits to build your map.</p>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6">
            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full blur-3xl pointer-events-none bg-emerald-400/10" />

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-300" />
                        Contribution Heatmap
                    </h2>
                    {summary && (
                        <p className="text-sm text-slate-400 mt-0.5">
                            Your habit activity this year ({year})
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Less</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div key={level} className={cn("w-3 h-3 rounded-sm", getEmeraldColor(level))} />
                    ))}
                    <span className="text-xs text-slate-500">More</span>
                </div>
            </div>

            {summaryNode ? (
                <div className="relative mb-5">
                    {summaryNode}
                </div>
            ) : null}

            <div className="relative w-full overflow-x-auto pb-2">
                <div className="inline-flex gap-6 min-w-max">
                    <div className="flex flex-col gap-[4px] mr-1 mt-6">
                        {dayLabels.map((label) => (
                            <div key={label} className="h-3.5 flex items-center">
                                <span className="text-[10px] text-slate-500 w-7">{label}</span>
                            </div>
                        ))}
                    </div>

                    {monthWeeks.map((weeks, monthIndex) => {
                        const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'short' });
                        return (
                            <div key={monthLabel} className="flex flex-col gap-2">
                                <div className="h-4 mb-1 flex items-center justify-center">
                                    <span className="text-[10px] text-slate-500">{monthLabel}</span>
                                </div>

                                <div className="inline-flex gap-[4px]">
                                    {weeks.map((week, weekIdx) => (
                                        <div key={`${monthLabel}-w-${weekIdx}`} className="flex flex-col gap-[4px]">
                                            {week.map((day, dayIdx) => {
                                                if (!day) {
                                                    return <div key={`${monthLabel}-e-${weekIdx}-${dayIdx}`} className="w-3.5 h-3.5" />;
                                                }

                                                return (
                                                    <div
                                                        key={day.date}
                                                        className={cn(
                                                            "w-3.5 h-3.5 rounded-[3px] transition-all cursor-pointer hover:scale-110 hover:ring-1 hover:ring-emerald-300/60",
                                                            getEmeraldColor(day.intensity)
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
                        );
                    })}
                </div>
            </div>

            <div className="mt-4 min-h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                {hoveredDay ? (
                    <span>
                        <span className="text-white font-medium">
                            {new Date(`${hoveredDay.date}T00:00:00`).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </span>
                        {' • '}
                        {hoveredDay.value} contributions
                        {maxValue > 0 ? '' : ''}
                    </span>
                ) : (
                    <span className="text-slate-400">Hover any cell to view day details</span>
                )}
            </div>
        </div>
    );
}
