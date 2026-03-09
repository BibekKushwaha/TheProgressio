"use client"
import { CalendarDays, Bell } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogTrigger, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector, useGetNudgesQuery, Nudge, useGetUserXPQuery } from '@repo/store';
import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { TimetableView } from '../planner/TimetableView';
import { CustomizeLayoutButton } from './CustomizeLayoutButton';
import { AmbientNudge } from './AmbientNudge';

// NotificationCenter and all its dependencies (NudgeCard, NudgeActions, utils, etc.)
// are excluded from the initial JS bundle. The chunk is fetched only when the user
// clicks the bell icon for the first time.
//
// webpack magic comments:
//   webpackChunkName  — gives the chunk a stable, human-readable filename instead
//                       of a hash (easier to identify in bundle reports).
//   webpackPrefetch   — emits a <link rel="prefetch"> hint so the browser downloads
//                       the chunk during idle time, before the user taps the bell.
const NotificationCenter = dynamic(
    () =>
        import(
            /* webpackChunkName: "notification-center" */
            /* webpackPrefetch: true */
            '@/components/notifications/NotificationCenter'
        ).then(
            (m) => ({ default: m.NotificationCenter })
        ),
    {
        ssr: false,
        loading: () => (
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 w-[94vw] sm:w-[500px]">
                <Skeleton className="h-8 w-48 bg-white/5 mb-4" />
                <Skeleton className="h-24 w-full bg-white/5 mb-2" />
                <Skeleton className="h-24 w-full bg-white/5" />
            </div>
        ),
    }
);

export function WelcomeHeader() {
    const user = useAppSelector((state) => state.auth.user);
    const { data } = useGetNudgesQuery();
    const nudges = data?.nudges || [];
    const unreadCount = nudges.filter((n: Nudge) => !n.isRead).length;
    const [lastOpenedCount, setLastOpenedCount] = useState(0);
    const displayedCount = Math.max(0, unreadCount - lastOpenedCount);
    const username = user?.username?.trim() || 'there';
    const { data: xpData } = useGetUserXPQuery();
    const xp = xpData?.xp;

    const today = useMemo(() => new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }), []);

    return (
        <>
            <PageHeader
                title={`Welcome back, ${username} 👋`}
                subtitle={`Let's make today productive. It's ${today}`}
            >
                <div className="flex items-center gap-4">
                    {/* XP & Level Badge */}
                    {xp && (
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)] rounded-xl">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-purple-300/80 uppercase tracking-wider">Level {xp.level}</span>
                                <span className="text-xs font-black text-white">{xp.levelName}</span>
                            </div>
                            <div className="w-24 h-2 bg-black/40 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000 relative"
                                    style={{ width: `${xp.progress}%` }}
                                >
                                    <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 blur-[2px]" />
                                </div>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-bold text-pink-300/80 uppercase tracking-wider">XP</span>
                                <span className="text-xs font-black text-white">{xp.xp}</span>
                            </div>
                        </div>
                    )}

                    <CustomizeLayoutButton />

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                onClick={() => setLastOpenedCount(unreadCount)}
                                aria-label="Notifications"
                                className="h-12 w-12 p-0 rounded-xl flex items-center justify-center bg-transparent hover:bg-white/10 text-white overflow-visible transition-all active:scale-95"
                            >
                                <span className="relative inline-flex items-center justify-center">
                                    <Bell className="w-5 h-5" />
                                    {displayedCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center w-5 h-5 border-2 border-[#030712] animate-in zoom-in">
                                            {displayedCount > 9 ? '9+' : displayedCount}
                                        </span>
                                    )}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" sideOffset={8} className="w-auto p-0 bg-transparent border-0 shadow-2xl">
                            <NotificationCenter />
                        </PopoverContent>
                    </Popover>

                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                                <Button
                                    className="relative hidden sm:inline-flex bg-slate-900 border border-white/10 hover:bg-slate-800 text-white h-12 px-6 rounded-xl font-bold transition-all active:scale-95"
                                >
                                    <CalendarDays className="w-5 h-5 mr-2 text-purple-400" />
                                    Schedule
                                </Button>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-slate-900 border-white/10 text-white p-0 overflow-hidden">
                            <DialogTitle className="sr-only">Your Schedule</DialogTitle>
                            <DialogDescription className="sr-only">
                                View and manage your weekly timetable and rotation schedule.
                            </DialogDescription>
                            <div className="p-6">
                                <TimetableView />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </PageHeader>
            <AmbientNudge />
        </>
    );
}
