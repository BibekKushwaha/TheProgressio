// components/achievements/AchievementsHeader.tsx
import { ProgressCard } from './ProgressCard';

export function AchievementsHeader() {
    return (
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                    Achievements & Milestones
                </h1>
                <p className="text-lg text-slate-400">
                    Track your progress and collect legendary rewards
                </p>
            </div>

            <ProgressCard />
        </div>
    );
}