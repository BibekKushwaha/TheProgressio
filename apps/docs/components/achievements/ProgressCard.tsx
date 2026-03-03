'use client';

import { useGetAchievementsQuery } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

export function ProgressCard() {
    const { data: achievementsData, isLoading } = useGetAchievementsQuery();

    const achievements = achievementsData?.achievements || [];
    const totalBadges = achievements.length;
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    // Default to 0 if totalBadges is 0 to avoid NaN
    const progress = totalBadges > 0 ? (unlockedCount / totalBadges) * 100 : 0;
    const badgesPerLevel = 5;
    const currentLevel = Math.floor(unlockedCount / badgesPerLevel) + 1;
    const nextLevel = currentLevel + 1;

    const remainingToNext = badgesPerLevel - (unlockedCount % badgesPerLevel);
    const isAllUnlocked = unlockedCount === totalBadges && totalBadges > 0;

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 min-w-[320px] space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28 bg-white/10" />
                    <Skeleton className="h-6 w-16 bg-white/10" />
                </div>
                <Skeleton className="h-3 w-full rounded-full bg-white/10" />
                <Skeleton className="h-4 w-48 bg-white/10" />
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
                    {isAllUnlocked ? 'All badges unlocked!' : `${remainingToNext} more badges`}
                </span> {isAllUnlocked ? 'achieved' : 'to reach'} <span className="font-semibold text-purple-300">{isAllUnlocked ? 'Max Level' : `Level ${nextLevel} Master`}</span> status
            </p>
        </div>
    );
}