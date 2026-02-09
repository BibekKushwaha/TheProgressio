'use client';

import { useGetAchievementsQuery } from '@repo/store';
import { BadgeCard } from './BadgeCard';
import { Skeleton } from '@/components/ui/skeleton';

export function BadgesGrid() {
    const { data: achievementsData, isLoading } = useGetAchievementsQuery();
    const achievements = achievementsData?.achievements || [];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-2xl bg-white/5 border border-white/10" />
                ))}
            </div>
        );
    }

    if (achievements.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-slate-400 text-lg">No achievements found.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((achievement) => (
                <BadgeCard
                    key={achievement.id}
                    badge={{
                        id: achievement.id,
                        title: achievement.name,
                        description: achievement.description,
                        icon: achievement.icon,
                        unlocked: achievement.unlocked,
                        progress: achievement.progress,
                        requirement: achievement.unlocked ? null : `Target: ${achievement.goalValue} ${achievement.type.toLowerCase()}`
                    }}
                />
            ))}
        </div>
    );
}