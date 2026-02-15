import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { TopStats } from '@/components/dashboard/TopStats';
import { WeeklyActivity } from '@/components/dashboard/WeeklyActivity';
import { QuickActions } from '@/components/dashboard/QuickAction';
import { TodaysTasks } from '@/components/dashboard/TodayTask';
import { MorningBriefing } from '@/components/dashboard/MorningBriefing';
import { LiveActivityWidget } from '@/components/dashboard/LiveActivityWidget';

import { DashboardGrid } from '@/components/layout/DashboardGrid';

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white">
            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
                <WelcomeHeader />
                <LiveActivityWidget />
                <TopStats />

                <DashboardGrid
                    sidebar={
                        <>
                            <MorningBriefing />
                            <QuickActions />
                        </>
                    }
                >
                    <WeeklyActivity />
                    <TodaysTasks />
                </DashboardGrid>
            </main>
        </div>
    );
}
