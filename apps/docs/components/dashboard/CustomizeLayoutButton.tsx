"use client";

import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDashboardLayout } from './DashboardLayoutContext';

export function CustomizeLayoutButton() {
    const { layout, toggleWidget, isMounted } = useDashboardLayout();

    if (!isMounted) return null;

    const labels: Record<keyof typeof layout, string> = {
        showLiveActivity: 'Live Activity',
        showTopStats: 'Top Stats',
        showMorningBriefing: 'Morning Briefing',
        showQuickActions: 'Quick Actions',
        showNotes: 'Notes',
        showActivityLedger: 'Activity Ledger',
        showWeeklyActivity: 'Weekly Activity',
        showTodaysTasks: 'Today\'s Tasks',
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all outline-none">
                    <Settings2 className="w-5 h-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-white/10 shadow-2xl z-[100]">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest border-b border-white/5 mb-1 text-center">
                    Customize Layout
                </div>
                {(Object.keys(layout) as Array<keyof typeof layout>).map((key) => (
                    <DropdownMenuCheckboxItem
                        key={key}
                        checked={layout[key]}
                        onCheckedChange={() => toggleWidget(key)}
                        className="text-slate-200 focus:bg-white/10 focus:text-white cursor-pointer"
                    >
                        {labels[key]}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
