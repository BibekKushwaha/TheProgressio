// components/analytics/ActivityHeatmap.tsx
export function ActivityHeatmap({ pastDays }: { pastDays: string }) {
    const weeks = 12;
    const daysPerWeek = 7;

    const generateHeatmapData = () => {
        const data = [];
        for (let week = 0; week < weeks; week++) {
            for (let day = 0; day < daysPerWeek; day++) {
                const intensity = Math.floor(Math.random() * 5);
                data.push({ week, day, intensity });
            }
        }
        return data;
    };

    const heatmapData = generateHeatmapData();

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
                                const dataPoint = heatmapData.find(
                                    (d) => d.week === weekIndex && d.day === dayIndex
                                );
                                return (
                                    <div
                                        key={`${weekIndex}-${dayIndex}`}
                                        className={`w-4 h-4 rounded ${getColor(dataPoint?.intensity || 0)} hover:ring-2 hover:ring-cyan-400 transition-all cursor-pointer`}
                                        title={`${dataPoint?.intensity || 0} sessions`}
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