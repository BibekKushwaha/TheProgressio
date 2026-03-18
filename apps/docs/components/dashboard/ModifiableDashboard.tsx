"use client";

import { useEffect } from 'react';

import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { ActivationChecklist } from '@/components/dashboard/ActivationChecklist';
import { AtRiskCard } from '@/components/dashboard/AtRiskCard';
import { TopStats } from '@/components/dashboard/TopStats';
import { WeeklyActivity } from '@/components/dashboard/WeeklyActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TodaysTasks } from '@/components/dashboard/TodaysTasks';
import { MorningBriefing } from '@/components/dashboard/MorningBriefing';
import { LiveActivityWidget } from '@/components/dashboard/LiveActivityWidget';
import { ActivityLedger } from '@/components/dashboard/ActivityLedger';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { useDashboardLayout } from './DashboardLayoutContext';
import { Skeleton } from '@/components/ui/skeleton';

export function ModifiableDashboard() {
    const { layout, isMounted } = useDashboardLayout();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) return;

            const widgets = Array.from(document.querySelectorAll('[data-widget="true"]')) as HTMLElement[];
            if (!widgets.length) return;

            const active = document.activeElement as HTMLElement;
            const currentIndex = widgets.indexOf(active);

            if (currentIndex === -1) return;

            e.preventDefault();

            let nextIndex = currentIndex;
            if (e.key === 'ArrowDown') nextIndex = Math.min(currentIndex + 1, widgets.length - 1);
            if (e.key === 'ArrowUp') nextIndex = Math.max(currentIndex - 1, 0);
            if (e.key === 'ArrowRight') nextIndex = Math.min(currentIndex + 1, widgets.length - 1);
            if (e.key === 'ArrowLeft') nextIndex = Math.max(currentIndex - 1, 0);

            const nextWidget = widgets[nextIndex];
            if (nextIndex !== currentIndex && nextWidget) {
                nextWidget.focus();
                nextWidget.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isMounted) {
        return (
            <div className="space-y-6 pt-0 md:pt-12 lg:pt-0">
                <Skeleton className="h-64 rounded-2xl w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    const Widget = ({ children }: { children: React.ReactNode }) => (
        <div
            data-widget="true"
            tabIndex={0}
            className="outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 rounded-2xl transition-all"
        >
            {children}
        </div>
    );

    return (
        <div className="space-y-6 pt-0 md:pt-12 lg:pt-0">
            <WelcomeHeader />
            <Widget><ActivationChecklist /></Widget>
            {layout.showLiveActivity && <Widget><LiveActivityWidget /></Widget>}
            {layout.showTopStats && <Widget><TopStats /></Widget>}

            <DashboardGrid
                sidebarHeader={layout.showMorningBriefing ? <Widget><AtRiskCard /></Widget> : null}
                sidebar={
                    <div className="space-y-6">
                        {layout.showMorningBriefing && <Widget><MorningBriefing /></Widget>}
                        {layout.showQuickActions && <Widget><QuickActions /></Widget>}
                        {layout.showActivityLedger && <Widget><ActivityLedger /></Widget>}
                    </div>
                }
            >
                <div className="space-y-6">
                    {layout.showWeeklyActivity && <Widget><WeeklyActivity /></Widget>}
                    {layout.showTodaysTasks && <Widget><TodaysTasks /></Widget>}
                </div>
            </DashboardGrid>
        </div>
    );
}
