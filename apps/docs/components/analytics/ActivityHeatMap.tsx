import { useGetContributionHeatmapQuery } from '@repo/store';
import { useMemo } from 'react';
import { GenericHeatmap } from './GenericHeatmap';
import { usePageVisibility } from '@/hooks/usePageVisibility';

export function ActivityHeatmap({ _pastDays }: { _pastDays: string }) {
    const isVisible = usePageVisibility();
    // Heatmap spans 90 days — it changes only when new sessions are logged.
    // 5-minute polling when visible; paused when the tab is in the background.
    const { data: heatmapResponse, isLoading } = useGetContributionHeatmapQuery(undefined, {
        pollingInterval: isVisible ? 300000 : 0,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    const heatmapData = useMemo(() => {
        if (!heatmapResponse?.heatmap) return [];

        return heatmapResponse.heatmap.map(day => ({
            date: day.date,
            value: day.count,
            intensity: day.intensity as 0 | 1 | 2 | 3 | 4
        }));
    }, [heatmapResponse]);

    return (
        <GenericHeatmap
            title={
                <div className="flex items-center justify-between w-full">
                    <h2 className="text-2xl font-bold text-white">Activity Heatmap</h2>
                    {heatmapResponse?.summary && (
                        <div className="flex gap-4 text-right">
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Consistency</div>
                                <div className="text-sm font-bold text-cyan-400 font-mono">{heatmapResponse.summary.consistencyRate}%</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Active Days</div>
                                <div className="text-sm font-bold text-white font-mono">{heatmapResponse.summary.activeDays}</div>
                            </div>
                        </div>
                    )}
                </div>
            }
            data={heatmapData}
            isLoading={isLoading}
            colorTheme="cyan"
            emptyMessage="No activity data recorded yet. Start tracking to see progress."
            reverseOrder={false}
        />
    );
}