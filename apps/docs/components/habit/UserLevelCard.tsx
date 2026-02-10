'use client';

import { Trophy, Zap, TrendingUp } from 'lucide-react';
import { useGetUserXPQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

export function UserLevelCard() {
    const { data: xpData, isLoading } = useGetUserXPQuery();

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <Skeleton className="h-6 w-32 bg-white/5 mb-4" />
                <Skeleton className="h-12 w-full bg-white/5 mb-2" />
                <Skeleton className="h-4 w-24 bg-white/5" />
            </div>
        );
    }

    if (!xpData) return null;

    const { level, levelName, xp, xpToNextLevel, progress } = xpData.xp;

    return (
        <div className="group bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-md border border-amber-500/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 relative overflow-hidden">
            {/* Animated background glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Your Level</h3>
                            <p className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                                {levelName}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-white">{level}</div>
                        <div className="text-xs text-slate-400">Level</div>
                    </div>
                </div>

                {/* XP Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-amber-400">
                            <Zap className="w-4 h-4" />
                            <span className="font-semibold">{xp} XP</span>
                        </div>
                        <div className="text-slate-400">
                            {xpToNextLevel} to next level
                        </div>
                    </div>

                    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <TrendingUp className="w-3 h-3" />
                        <span>{Math.round(progress)}% to Level {level + 1}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
