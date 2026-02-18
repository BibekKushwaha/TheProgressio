import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { TopStats } from '@/components/dashboard/TopStats';
import { WeeklyActivity } from '@/components/dashboard/WeeklyActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TodaysTasks } from '@/components/dashboard/TodaysTasks';
import { MorningBriefing } from '@/components/dashboard/MorningBriefing';
import { LiveActivityWidget } from '@/components/dashboard/LiveActivityWidget';

import { DashboardGrid } from '@/components/layout/DashboardGrid';

export default function DashboardPage() {
    return (
        <div className="space-y-6">
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
        </div>
    );
}
