'use client';

import { useGetContributionHeatmapQuery } from '@repo/store';

export function ContributionHeatmap() {
    const { data, isLoading } = useGetContributionHeatmapQuery();
    const heatmap = data?.heatmap || [];
    const summary = data?.summary;

    // Group heatmap days into weeks (columns), each column = 7 days
    const weeks: typeof heatmap[] = [];
    for (let i = 0; i < heatmap.length; i += 7) {
        weeks.push(heatmap.slice(i, i + 7));
    }

    const getColor = (intensity: 0 | 1 | 2 | 3 | 4) => {
        const colors: Record<number, string> = {
            0: 'bg-slate-800/50',
            1: 'bg-emerald-900/50',
            2: 'bg-emerald-700/60',
            3: 'bg-emerald-500/80',
            4: 'bg-emerald-400',
        };
        return colors[intensity] ?? 'bg-slate-800/50';
    };

    const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-48 mb-4" />
                <div className="h-32 bg-white/5 rounded" />
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white">Contribution Heatmap</h2>
                    {summary && (
                        <p className="text-sm text-slate-400 mt-0.5">
                            {summary.totalContributions} contributions • {summary.activeDays} active days • {summary.consistencyRate}% consistency
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Less</span>
                    {[0, 1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className={`w-3 h-3 rounded-sm ${getColor(level as 0 | 1 | 2 | 3 | 4)}`}
                        />
                    ))}
                    <span className="text-xs text-slate-500">More</span>
                </div>
            </div>

            <div className="overflow-x-auto pb-2">
                <div className="inline-flex gap-[3px]">
                    {/* Day labels */}
                    <div className="flex flex-col gap-[3px] mr-1">
                        {dayLabels.map((label, i) => (
                            <div key={i} className="h-3 flex items-center">
                                <span className="text-[10px] text-slate-500 w-7">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Heatmap grid */}
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-[3px]">
                            {week.map((day, dayIdx) => (
                                <div
                                    key={dayIdx}
                                    className={`w-3 h-3 rounded-sm ${getColor(day.intensity)} hover:ring-1 hover:ring-emerald-400/50 transition-all cursor-pointer`}
                                    title={`${day.date}: ${day.count} completions`}
                                />
                            ))}
                            {/* Pad if week is incomplete */}
                            {Array.from({ length: 7 - week.length }).map((_, i) => (
                                <div key={`pad-${i}`} className="w-3 h-3" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
