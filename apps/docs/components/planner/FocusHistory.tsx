// components/task/FocusHistory.tsx
export function FocusHistory() {
    // Mock data for visualization - to be replaced with real activity logs
    const days = [
        { day: 'Mon', minutes: 45, isToday: false },
        { day: 'Tue', minutes: 60, isToday: false },
        { day: 'Wed', minutes: 30, isToday: false },
        { day: 'Thu', minutes: 75, isToday: false },
        { day: 'Fri', minutes: 15, isToday: true },
        { day: 'Sat', minutes: 0, isToday: false },
        { day: 'Sun', minutes: 0, isToday: false },
    ];

    const maxMinutes = Math.max(...days.map(d => d.minutes));

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Focus History</h2>

            <div className="flex items-end justify-between gap-2 h-32">
                {days.map((day, index) => {
                    const height = day.minutes > 0 ? (day.minutes / maxMinutes) * 100 : 5;

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                            <div className="relative w-full flex items-end justify-center h-24">
                                <div
                                    className={`w-full rounded-t-lg transition-all duration-300 ${day.isToday
                                        ? 'bg-gradient-to-t from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/50'
                                        : day.minutes > 0
                                            ? 'bg-gradient-to-t from-indigo-600/60 to-purple-600/60'
                                            : 'bg-white/10'
                                        }`}
                                    style={{ height: `${height}%` }}
                                >
                                    {day.minutes > 0 && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-indigo-300">
                                            {day.minutes}m
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className={`text-xs ${day.isToday ? 'text-indigo-400 font-semibold' : 'text-slate-400'}`}>
                                {day.day}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}