'use client';
import { AchievementsHeader } from '@/components/achievements/AchievementsHeader';
import { BadgesTabs } from '@/components/achievements/BadgesTabs';
import { BadgesGrid } from '@/components/achievements/BadgesGrid';
import { Award, Sparkles, Target, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGetAchievementsQuery } from '@repo/store';
import { getApiErrorReportStatus } from '@/lib/api-error';
import { reportApiError } from '@/lib/errorReporter';

export default function AchievementsPage() {
    const [filter, setFilter] = useState('all');
    const {
        data: achievementsData,
        isLoading,
        isError,
        error,
        refetch,
    } = useGetAchievementsQuery();

    useEffect(() => {
        if (error) {
            reportApiError(getApiErrorReportStatus(error), 'getAchievements', error);
        }
    }, [error]);

    const achievements = achievementsData?.achievements ?? [];
    const totalBadges    = achievements.length;
    const unlockedCount  = achievements.filter(a => a.unlocked).length;
    const badgesPerLevel = 5;
    const currentLevel   = Math.floor(unlockedCount / badgesPerLevel) + 1;
    const completionPct  = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;

    if (isError && achievements.length === 0 && !isLoading) {
        return (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-white backdrop-blur-xl">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-red-400/30 bg-red-500/20 p-2">
                        <AlertTriangle className="h-5 w-5 text-red-200" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold">Achievements are temporarily unavailable</h2>
                        <p className="mt-2 text-sm text-slate-200">
                            We could not load your achievement progress right now.
                        </p>
                        <button
                            onClick={() => void refetch()}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Retry achievements
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            {isError ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 backdrop-blur-xl">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                            <p>Achievement progress may be stale because the latest badge sync failed. Showing the most recent data available.</p>
                        </div>
                        <button
                            onClick={() => void refetch()}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
                        >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Retry sync
                        </button>
                    </div>
                </div>
            ) : null}
            <div
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/[0.16] via-fuchsia-500/[0.10] to-indigo-500/[0.10] p-6 md:p-8"
                style={{
                    backgroundImage:
                        'radial-gradient(ellipse 400px 400px at -5% -15%, rgba(232,121,249,0.08) 0%, transparent 70%), ' +
                        'radial-gradient(ellipse 400px 400px at 105% 110%, rgba(99,102,241,0.08) 0%, transparent 70%)',
                }}
            >
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-xs text-violet-100 mb-4">
                                <Sparkles className="w-3.5 h-3.5" />
                                Achievement Vault
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white">
                                Progress Milestones
                            </h1>
                            <p className="mt-2 text-slate-300 max-w-2xl">
                                Unlock badges by staying consistent, completing tasks, and building deep-work habits.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-[280px]">
                            <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2">
                                <div className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Award className="w-3.5 h-3.5 text-amber-300" />
                                    Badges
                                </div>
                                <div className="mt-1 text-lg font-semibold text-white">
                                    {unlockedCount}
                                    <span className="text-sm font-normal text-slate-400"> / {totalBadges}</span>
                                </div>
                            </div>
                            <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2">
                                <div className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5 text-cyan-300" />
                                    Level
                                </div>
                                <div className="mt-1 text-lg font-semibold text-white">Lv. {currentLevel}</div>
                            </div>
                            <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2">
                                <div className="text-xs text-slate-400 uppercase tracking-wide">Complete</div>
                                <div className="mt-1 text-lg font-semibold text-white">{completionPct}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <AchievementsHeader />
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
                    <BadgesTabs activeTab={filter} onTabChange={setFilter} />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
                    <BadgesGrid filter={filter} />
                </div>
            </div>
    );
}
