"use client"
import { CalendarDays, Bell } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { NotificationCenter } from '@/components/habit/NotificationCenter';
import { useAppSelector, useGetNudgesQuery, Nudge, useGetUserXPQuery } from '@repo/store';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';

export function WelcomeHeader() {
    const user = useAppSelector((state) => state.auth.user);
    const { data } = useGetNudgesQuery();
    const nudges = data?.nudges || [];
    const unreadCount = nudges.filter((n: Nudge) => !n.isRead).length;
    const [sawNotifications, setSawNotifications] = useState(false);
    const displayedCount = sawNotifications ? 0 : unreadCount;
    const router = useRouter();
    const username = user?.username?.trim() || 'there';
    const { data: xpData } = useGetUserXPQuery();
    const xp = xpData?.xp;

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <PageHeader
            title={`Welcome back, ${username} 👋`}
            subtitle={`Let's make today productive. It's ${today}`}
        >
            <div className="flex items-center gap-4">
                {/* XP & Level Badge */}
                {xp && (
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Level {xp.level}</span>
                            <span className="text-xs font-black text-white">{xp.levelName}</span>
                        </div>
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                                style={{ width: `${xp.progress}%` }}
                            />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">XP</span>
                            <span className="text-xs font-black text-white">{xp.xp}</span>
                        </div>
                    </div>
                )}

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            onClick={() => setSawNotifications(true)}
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
                    <PopoverContent className="w-auto p-0 bg-transparent border-0 shadow-2xl">
                        <NotificationCenter />
                    </PopoverContent>
                </Popover>

                <Button
                    onClick={() => router.push('/calendar')}
                    className="hidden sm:inline-flex bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/25 h-12 px-6 rounded-xl font-bold transition-all active:scale-95"
                >
                    <CalendarDays className="w-5 h-5 mr-2" />
                    Schedule
                </Button>
            </div>
        </PageHeader>
    );
}
