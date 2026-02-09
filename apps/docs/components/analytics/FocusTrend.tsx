import { useGetWeeklyTrendsQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

export function FocusTrends({ pastDays }: { pastDays: string }) {
    const { data: trendsData, isLoading } = useGetWeeklyTrendsQuery();

    const rawData = trendsData?.data || [
        { date: 'Mon', hours: 0 },
        { date: 'Tue', hours: 0 },
        { date: 'Wed', hours: 0 },
        { date: 'Thu', hours: 0 },
        { date: 'Fri', hours: 0 },
        { date: 'Sat', hours: 0 },
        { date: 'Sun', hours: 0 },
    ];

    const data = rawData.map(d => ({
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        hours: d.hours,
        percentage: Math.min(100, (d.hours / 8) * 100) // Assuming 8h is 100% for visualization
    }));

    const maxHours = Math.max(...data.map(d => d.hours), 1);

    // Calculate SVG path points
    const points = data.map((d, i) => `${i * 100},${256 - (d.hours / maxHours) * 200}`).join(' L ');
    const areaPath = `M 0 256 L ${points} L 600 256 Z`;
    const linePath = `M ${points}`;

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
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

            <div className="relative h-64">
                {isLoading ? (
                    <Skeleton className="w-full h-full bg-white/5" />
                ) : (
                    <>
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 256">
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
                                    key={index}
                                    cx={index * 100}
                                    cy={256 - (point.hours / maxHours) * 200}
                                    r="5"
                                    fill="rgb(6, 182, 212)"
                                    className="hover:r-7 transition-all cursor-pointer"
                                />
                            ))}
                        </svg>

                        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-slate-400">
                            {data.map((point, index) => (
                                <div key={index} className="flex flex-col items-center">
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