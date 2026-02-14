import { useGetWeeklyTrendsQuery } from '@repo/store';
import { useMemo } from 'react';
import { GenericHeatmap, type HeatmapDataPoint } from './GenericHeatmap';

export function ActivityHeatmap({ pastDays }: { pastDays: string }) {
    const parsedDays = Number.parseInt(pastDays, 10);
    const weeks = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.ceil(parsedDays / 7) : 12;

    const { data: trendsResponse, isLoading } = useGetWeeklyTrendsQuery();

    const trendsByDate = useMemo(() => {
        const map = new Map<string, number>();
        if (trendsResponse?.data) {
            for (const entry of trendsResponse.data) {
                map.set(entry.date, entry.minutes ?? 0);
            }
        }
        return map;
    }, [trendsResponse]);

    const heatmapData = useMemo(() => {
        const data: HeatmapDataPoint[] = [];
        const now = new Date();
        const totalDays = weeks * 7;

        // Generate last N weeks of dates
        for (let i = 0; i < totalDays; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().split('T')[0]!;

            const minutes = trendsByDate.get(dateKey) ?? 0;
            const intensity = minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 120 ? 3 : 4;

            data.push({
                date: dateKey,
                value: minutes,
                intensity: intensity as 0 | 1 | 2 | 3 | 4
            });
        }
        return data;
    }, [trendsByDate, weeks]);

    return (
        <GenericHeatmap
            title={<h2 className="text-2xl font-bold">Activity Heatmap</h2>}
            data={heatmapData}
            isLoading={isLoading}
            colorTheme="cyan"
            emptyMessage="No activity data recorded yet."
            reverseOrder={false}
        />
    );
}