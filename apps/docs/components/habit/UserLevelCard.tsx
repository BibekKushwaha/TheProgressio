'use client';

import { Trophy, Zap, TrendingUp } from 'lucide-react';
import { useGetUserXPQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/toast-provider';

const getErrorMessage = (error: unknown): string => {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string') return message;
    }
    return 'Unknown error';
};

export function UserLevelCard() {
    const { data: xpData, isLoading, isError, error, refetch } = useGetUserXPQuery();
    const { toast } = useToast();

    const prevXpRef = useRef<number | null>(null);
    const prevLevelRef = useRef<number | null>(null);

    useEffect(() => {
        const currentXp = xpData?.xp?.xp ?? null;
        const currentLevel = xpData?.xp?.level ?? null;
        const prevXp = prevXpRef.current;
        const prevLevel = prevLevelRef.current;

        if (prevXp !== null && currentXp !== null && currentXp > prevXp) {
            const delta = currentXp - prevXp;
            if (prevLevel !== null && currentLevel !== null && currentLevel > prevLevel) {
                toast(`+${delta} XP — Level ${prevLevel} → ${currentLevel}`, 'success');
            } else {
                toast(`+${delta} XP`, 'success');
            }
        }

        prevXpRef.current = currentXp;
        prevLevelRef.current = currentLevel;
    }, [xpData, toast]);

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/[0.06] via-amber-500/[0.05] to-white/[0.02] backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <Skeleton className="h-6 w-32 bg-white/5 mb-4" />
                <Skeleton className="h-16 w-full bg-white/5 mb-3" />
                <Skeleton className="h-3 w-full bg-white/5 mb-2" />
                <Skeleton className="h-4 w-28 bg-white/5" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-gradient-to-br from-white/[0.06] via-amber-500/[0.05] to-white/[0.02] backdrop-blur-md border border-white/20 rounded-2xl p-6">
                <div className="text-sm text-rose-400 mb-2">Failed to load XP.</div>
                <div className="text-xs text-slate-400 mb-4">{getErrorMessage(error)}</div>
                <div>
                    <button
                        onClick={() => refetch()}
                        className="bg-amber-500 text-black px-3 py-2 rounded-lg font-semibold"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!xpData) return null;

    const { level, levelName, xp, xpToNextLevel, progress } = xpData.xp;

    return (
        <div className="group relative overflow-hidden bg-gradient-to-br from-white/[0.06] via-amber-500/[0.06] to-white/[0.02] backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute -left-16 -bottom-16 w-40 h-40 bg-orange-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30">
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

                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">Current XP</div>
                        <div className="mt-1 text-sm font-semibold text-white">{xp}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">To Next</div>
                        <div className="mt-1 text-sm font-semibold text-white">{xpToNextLevel}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">Progress</div>
                        <div className="mt-1 text-sm font-semibold text-white">{Math.round(progress)}%</div>
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

                    <div className="relative h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20" />
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
