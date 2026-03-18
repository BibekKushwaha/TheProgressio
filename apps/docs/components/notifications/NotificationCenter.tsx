'use client';

import { useState } from 'react';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useGetNudgesQuery } from '@repo/store';
import type { Nudge } from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, TrendingUp, AlertCircle, Sparkles, Award, CalendarDays } from 'lucide-react';
import { NudgeCard } from './NudgeCard';
import { useNudgeActions } from './useNudgeActions';
import { parseNudgeMetadata } from './notificationUtils';

type FilterId = 'all' | 'unread' | 'revision' | 'streak_reminder' | 'urgency_driven' | 'suggestion' | 'achievement';

const FILTER_TABS: { id: FilterId; label: string; Icon: React.ElementType }[] = [
    { id: 'all', label: 'All', Icon: Bell },
    { id: 'revision', label: 'Revision', Icon: CalendarDays },
    { id: 'streak_reminder', label: 'Streaks', Icon: TrendingUp },
    { id: 'urgency_driven', label: 'Priority', Icon: AlertCircle },
    { id: 'suggestion', label: 'Tips', Icon: Sparkles },
    { id: 'achievement', label: 'Awards', Icon: Award },
];

export function NotificationCenter() {
    const isMounted = useIsMounted();
    const { data, isLoading } = useGetNudgesQuery();
    const [filter, setFilter] = useState<FilterId>('all');

    const {
        handleMarkRead,
        handleMarkAllRead,
        handleDirectReply,
        runAction,
        snoozeTask,
        isMarkingAllRead,
        isReplying,
    } = useNudgeActions();

    const nudges: Nudge[] = data?.nudges ?? [];
    const unreadCount = nudges.filter((n) => !n.isRead).length;

    const filteredNudges = nudges.filter((n) => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'all') return true;
        if (filter === 'revision') return parseNudgeMetadata(n.metadata).dripCampaign === true;
        return n.type === filter;
    });

    if (!isMounted || isLoading) {
        return (
            <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6 max-w-[94vw] w-[94vw] sm:w-auto overflow-hidden">
                <Skeleton className="h-8 w-48 bg-white/5 mb-4" />
                <Skeleton className="h-24 w-full bg-white/5 mb-2" />
                <Skeleton className="h-24 w-full bg-white/5" />
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-slate-900 to-indigo-950/95 backdrop-blur-xl border-purple-500/30 p-4 sm:p-6 max-w-[94vw] w-[94vw] sm:w-[500px] flex flex-col max-h-[85vh] shadow-[0_0_40px_rgba(0,0,0,0.5)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl relative">
                        <Bell className="w-6 h-6 text-white" />
                        {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {unreadCount}
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Notifications</h2>
                        <p className="text-sm text-slate-400">{unreadCount} unread</p>
                    </div>
                </div>

                {unreadCount > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isMarkingAllRead}
                        onClick={handleMarkAllRead}
                        className="bg-white/5 border-white/10 hover:bg-white/10 text-xs"
                    >
                        {isMarkingAllRead ? 'Marking...' : 'Mark all read'}
                    </Button>
                )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide shrink-0">
                {FILTER_TABS.map(({ id, label, Icon }) => (
                    <button
                        type="button"
                        key={id}
                        onClick={() => setFilter(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium transition-all whitespace-nowrap ${filter === id
                            ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Nudge list */}
            {filteredNudges.length > 0 ? (
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                    {filteredNudges.map((nudge) => (
                        <NudgeCard
                            key={nudge.id}
                            nudge={nudge}
                            onMarkRead={handleMarkRead}
                            onRunAction={runAction}
                            onDirectReply={handleDirectReply}
                            onSnooze={snoozeTask}
                            isReplying={isReplying}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 flex-1 flex flex-col items-center justify-center min-h-[200px]">
                    <Bell className="w-12 h-12 text-slate-500 opacity-30 mb-4" />
                    <p className="text-slate-400 font-medium">
                        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                </div>
            )}
        </Card>
    );
}
