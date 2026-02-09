// app/achievements/page.tsx
import { AchievementsHeader } from '@/components/achievements/AchievementsHeader';
import { BadgesTabs } from '@/components/achievements/BadgesTabs';
import { BadgesGrid } from '@/components/achievements/BadgesGrid';

export default function AchievementsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <AchievementsHeader />
                <BadgesTabs />
                <BadgesGrid />
            </div>
        </div>
    );
}