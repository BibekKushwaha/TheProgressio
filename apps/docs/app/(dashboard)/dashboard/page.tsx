import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { TopStats } from '@/components/dashboard/TopStats';
import { WeeklyActivity } from '@/components/dashboard/WeeklyActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TodaysTasks } from '@/components/dashboard/TodaysTasks';
import { MorningBriefing } from '@/components/dashboard/MorningBriefing';
import { LiveActivityWidget } from '@/components/dashboard/LiveActivityWidget';
import { ActivityLedger } from '@/components/dashboard/ActivityLedger';
import { NotesWidget } from '@/components/dashboard/NotesWidget';
import { QRAttendance } from '@/components/settings/QRAttendance';

import { DashboardGrid } from '@/components/layout/DashboardGrid';

export default function DashboardPage() {
    return (
        <div className="space-y-6 pt-0 md:pt-12 lg:pt-0">
            <WelcomeHeader />
            <LiveActivityWidget />
            <TopStats />

            <DashboardGrid
                sidebar={
                    <div className="space-y-6">
                        <MorningBriefing />
                        <QuickActions />
                        <NotesWidget />
                    </div>
                }
            >
                <div className="space-y-6">
                    <WeeklyActivity />
                    <TodaysTasks />
                    <QRAttendance />
                    <ActivityLedger />
                </div>
            </DashboardGrid>
        </div>
    );
}
