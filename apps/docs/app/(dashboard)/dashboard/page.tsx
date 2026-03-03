import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { TopStats } from '@/components/dashboard/TopStats';
import { WeeklyActivity } from '@/components/dashboard/WeeklyActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TodaysTasks } from '@/components/dashboard/TodaysTasks';
import { MorningBriefing } from '@/components/dashboard/MorningBriefing';
import { LiveActivityWidget } from '@/components/dashboard/LiveActivityWidget';
import { ActivityLedger } from '@/components/dashboard/ActivityLedger';
import { NotesWidget } from '@/components/dashboard/NotesWidget';


import { DashboardGrid } from '@/components/layout/DashboardGrid';

export default function DashboardPage() {
    return (
        <div className="space-y-6 pt-0 md:pt-12 lg:pt-0">
            <WelcomeHeader />
            <LiveActivityWidget />
            <TopStats />

            {/*
             * DashboardGrid's sidebarHeader prop renders MorningBriefing ONCE —
             * above the main column on mobile, at the top of the sidebar on desktop.
             * This eliminates the previous double-mount (lg:hidden + hidden lg:block)
             * that caused useGetMorningBriefingQuery to fire twice on every load.
             *
             * ActivityLedger is placed in the sidebar so it is always rendered and
             * visible — no more hidden-but-mounted pattern on mobile.
             */}
            <DashboardGrid
                sidebarHeader={<MorningBriefing />}
                sidebar={
                    <div className="space-y-6">
                        <QuickActions />
                        <NotesWidget />
                        <ActivityLedger />
                    </div>
                }
            >
                <div className="space-y-6">
                    <WeeklyActivity />
                    <TodaysTasks />
                </div>
            </DashboardGrid>
        </div>
    );
}
