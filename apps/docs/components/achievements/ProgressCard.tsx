'use client';

import { useGetAchievementsQuery } from '@repo/store';

export function ProgressCard() {
    const { data: achievementsData, isLoading } = useGetAchievementsQuery();

    const achievements = achievementsData?.achievements || [];
    const totalBadges = achievements.length;
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    // Default to 0 if totalBadges is 0 to avoid NaN
    const progress = totalBadges > 0 ? (unlockedCount / totalBadges) * 100 : 0;
    const nextLevel = Math.floor(unlockedCount / 5) + 1;

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 min-w-[320px] animate-pulse">
                <div className="h-6 w-32 bg-white/10 rounded mb-4"></div>
                <div className="h-3 w-full bg-white/10 rounded mb-4"></div>
                <div className="h-4 w-48 bg-white/10 rounded"></div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 min-w-[320px]">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400 font-semibold">Overall Progress</span>
                <span className="text-2xl font-bold">{unlockedCount} / {totalBadges}</span>
            </div>

            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <p className="text-sm text-slate-400">
                <span className="font-semibold text-purple-400">
                    {totalBadges - unlockedCount > 0 ? `${totalBadges - unlockedCount} more badges` : 'All badges unlocked!'}
                </span> to reach{' '}
                <span className="font-semibold text-purple-300">Level {nextLevel + 1} Master</span> status
            </p>
        </div>
    );
}
