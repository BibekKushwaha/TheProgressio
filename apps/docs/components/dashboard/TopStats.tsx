// components/dashboard/TopStats.tsx
import { Target, TrendingUp, Flame } from 'lucide-react';

export function TopStats() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Daily Goal</div>
                        <div className="text-3xl font-bold">2.5h / 4h</div>
                    </div>
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="6"
                            />
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="url(#gradient1)"
                                strokeWidth="6"
                                strokeDasharray={`${(63 / 100) * 176} 176`}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="rgb(168, 85, 247)" />
                                    <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Target className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                </div>
                <div className="text-sm font-semibold text-purple-400">63% Complete</div>
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Focus Score</div>
                        <div className="text-3xl font-bold">85</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-sm text-slate-400">Top 10%</div>
                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-semibold text-green-400">
                            +5 pts
                        </span>
                    </div>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: '85%' }}
                    ></div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Active Streak</div>
                        <div className="text-3xl font-bold">12</div>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                        <Flame className="w-6 h-6" />
                    </div>
                </div>
                <div className="text-sm text-slate-400 mb-2">Days in a row</div>
                <div className="flex gap-1">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-2 rounded-full ${i < 12
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                    : 'bg-white/10'
                                }`}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
}