"use client"
import { CalendarDays, Bell } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { NotificationCenter } from '@/components/habit/NotificationCenter';
import { useAppSelector, useGetNudgesQuery, Nudge } from '@repo/store';
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
            <div className="flex items-center">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            onClick={() => setSawNotifications(true)}
                            aria-label="Notifications"
                            className="mr-3 h-12 w-12 p-0 rounded-xl flex items-center justify-center bg-transparent hover:bg-white/10 text-white overflow-visible z-40"
                        >
                            <span className="relative inline-flex items-center justify-center">
                                <Bell className="w-5 h-5" />
                                {displayedCount > 0 && (
                                    <span className="absolute top-1 right-0 translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center w-5 h-5 min-w-[20px] z-50">
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
                    className="hidden sm:inline-flex bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/25 h-12 px-6 rounded-xl font-bold"
                >
                    <CalendarDays className="w-5 h-5 mr-2" />
                    View Schedule
                </Button>
            </div>
        </PageHeader>
    );
}
