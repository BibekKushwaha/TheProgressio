'use client';

import { useGetWeeklyTrendsQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';
import { getDebugPollingOptions } from '@/lib/refetchDebug';

const DEFAULT_TRENDS = [
    { date: 'Mon', hours: 0 },
    { date: 'Tue', hours: 0 },
    { date: 'Wed', hours: 0 },
    { date: 'Thu', hours: 0 },
    { date: 'Fri', hours: 0 },
    { date: 'Sat', hours: 0 },
    { date: 'Sun', hours: 0 },
];

export function FocusTrends({ pastDays }: { pastDays: string }) {
    // Weekly trend data changes at most once per session-log.
    const { data: trendsData, isLoading } = useGetWeeklyTrendsQuery(
        undefined,
        getDebugPollingOptions('focusTrends.weekly', 300000)
    );
    const chartWidth = 600;
    const chartHeight = 256;

    const formatDayLabel = (value: string) => {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString('en-US', { weekday: 'short' });
        }
        const compact = value.trim();
        if (!compact) return 'N/A';
        return compact.length <= 3 ? compact : compact.slice(0, 3);
    };

    const rawData = trendsData?.data || DEFAULT_TRENDS;

    const maxPoints = pastDays === "7" ? 14 : 7;
    const visibleRawData = rawData.slice(-maxPoints);
    const data = visibleRawData.map((d) => ({
        day: formatDayLabel(d.date),
        hours: d.hours,
    }));

    const maxHours = Math.max(...data.map(d => d.hours), 1);
    const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;

    // Calculate SVG path points
    const points = data.map((d, i) => `${i * xStep},${chartHeight - (d.hours / maxHours) * 200}`).join(' L ');
    const areaPath = `M 0 ${chartHeight} L ${points} L ${chartWidth} ${chartHeight} Z`;
    const linePath = `M ${points}`;

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 ">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold mb-1">Focus Trends</h2>
                    <p className="text-sm text-slate-400">{pastDays === "1" ? "Today's Focus" : "Last 7 Days"}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                    <span className="text-xs text-slate-400">Focus Time</span>
                </div>
            </div>

            <div className="relative h-64 mb-4">
                {isLoading ? (
                    <Skeleton className="w-full h-full bg-white/5" />
                ) : (
                    <>
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                            <defs>
                                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="rgb(6, 182, 212)" />
                                    <stop offset="100%" stopColor="rgb(37, 99, 235)" />
                                </linearGradient>
                            </defs>

                            <path d={areaPath} fill="url(#areaGradient)" />
                            <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                            {data.map((point, index) => (
                                <circle
                                    key={`${point.day}-${index}`}
                                    cx={index * xStep}
                                    cy={chartHeight - (point.hours / maxHours) * 200}
                                    r="5"
                                    fill="rgb(6, 182, 212)"
                                    className="hover:r-7 transition-all cursor-pointer"
                                />
                            ))}
                        </svg>

                        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-slate-400">
                            {data.map((point, index) => (
                                <div key={`${point.day}-${point.hours}-${index}`} className="flex flex-col items-center">
                                    <span>{point.day}</span>
                                    <span className="text-cyan-400 font-semibold mt-1">{point.hours}h</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
