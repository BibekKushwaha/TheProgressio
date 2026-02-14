'use client';

import { useGetContributionHeatmapQuery } from '@repo/store';
import { Activity, CalendarDays, Sparkles } from 'lucide-react';
import { GenericHeatmap, type HeatmapDataPoint } from '../analytics/GenericHeatmap';

export function ContributionHeatmap() {
    const { data, isLoading } = useGetContributionHeatmapQuery();
    const summary = data?.summary;

    const heatmapData: HeatmapDataPoint[] = (data?.heatmap ?? []).map((d: { date: string; count: number; intensity: number }) => ({
        date: d.date,
        value: d.count,
        intensity: d.intensity as 0 | 1 | 2 | 3 | 4
    }));

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

    return (
        <GenericHeatmap
            title={
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
            }
            data={heatmapData}
            isLoading={isLoading}
            colorTheme="emerald"
            summary={summaryNode}
            reverseOrder={true}
            emptyMessage="No activity yet. Complete habits to build your map."
        />
    );
}
