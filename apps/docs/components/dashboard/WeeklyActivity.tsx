// components/dashboard/WeeklyActivity.tsx
export function WeeklyActivity() {
    const data = [
        { day: 'Mon', hours: 3.2, percentage: 64 },
        { day: 'Tue', hours: 4.5, percentage: 90 },
        { day: 'Wed', hours: 2.8, percentage: 56 },
        { day: 'Thu', hours: 3.9, percentage: 78 },
        { day: 'Fri', hours: 4.2, percentage: 84 },
        { day: 'Sat', hours: 2.5, percentage: 50 },
        { day: 'Sun', hours: 3.5, percentage: 70 },
    ];

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Weekly Activity</h2>
                <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                    <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600/40 to-pink-600/40 border border-purple-500/50 text-sm font-semibold transition-all duration-300">
                        Week
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300">
                        Month
                    </button>
                </div>
            </div>

            <div className="relative h-64 mb-4">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 700 256">
                    <defs>
                        <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="activityLine" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                            <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                        </linearGradient>
                    </defs>

                    <path
                        d="M 0 256 L 0 154 L 100 51 L 200 113 L 300 123 L 400 41 L 500 128 L 600 77 L 700 77 L 700 256 Z"
                        fill="url(#activityGradient)"
                    />

                    <path
                        d="M 0 154 L 100 51 L 200 113 L 300 123 L 400 41 L 500 128 L 600 77 L 700 77"
                        fill="none"
                        stroke="url(#activityLine)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {data.map((point, index) => (
                        <circle
                            key={point.day}
                            cx={index * 100}
                            cy={256 - point.percentage * 2.05}
                            r="6"
                            fill="rgb(168, 85, 247)"
                            className="hover:r-8 transition-all cursor-pointer"
                        />
                    ))}
                </svg>
            </div>

            <div className="flex justify-between px-2">
                {data.map((point) => (
                    <div key={point.day} className="flex flex-col items-center">
                        <span className="text-sm text-slate-400 mb-1">{point.day}</span>
                        <span className="text-sm font-semibold text-purple-400">{point.hours}h</span>
                    </div>
                ))}
            </div>
        </div>
    );
}