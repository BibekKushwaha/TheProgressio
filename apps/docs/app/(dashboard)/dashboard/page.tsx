// app/page.tsx
import { Navbar } from '../../../components/Navbar';
import { WelcomeHeader } from '../../../components/dashboard/WelcomeHeader';
import { TopStats } from '../../../components/dashboard/TopStats';
import { WeeklyActivity } from '../../../components/dashboard/WeeklyActivity';
import { QuickActions } from '../../../components/dashboard/QuickAction';
import { TodaysTasks } from '../../../components/dashboard/TodayTask';
import { HabitStreaks } from '../../../components/dashboard/HabitStreaks';
import { UserLevelCard } from '../../../components/habit/UserLevelCard';
import { MorningBriefing } from '../../../components/dashboard/MorningBriefing';
import { LiveActivityWidget } from '../../../components/dashboard/LiveActivityWidget';

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white">
            <Navbar navLinks={['Dashboard']} />
            <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                <WelcomeHeader />
                <LiveActivityWidget />
                <TopStats />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <WeeklyActivity />
                        <TodaysTasks />
                    </div>
                    <div className="space-y-6">
                        <MorningBriefing />
                        <UserLevelCard />
                        <QuickActions />
                        <HabitStreaks />
                    </div>
                </div>
            </main>
        </div>
    );
}