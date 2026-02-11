'use client';

import { useState } from 'react';
import { useGetNudgesQuery, useMarkNudgeAsReadMutation, Nudge } from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCircle, AlertCircle, Info, TrendingUp } from 'lucide-react';

export function NotificationCenter() {
    const { data, isLoading } = useGetNudgesQuery();
    const [markRead] = useMarkNudgeAsReadMutation();
    const [filter, setFilter] = useState<'all' | 'unread'>('unread');

    const nudges = data?.nudges || [];
    const filteredNudges = filter === 'unread'
        ? nudges.filter((n: Nudge) => !n.isRead)
        : nudges;

    const unreadCount = nudges.filter((n: Nudge) => !n.isRead).length;

    const handleMarkRead = async (id: string) => {
        try {
            await markRead(id).unwrap();
        } catch (error) {
            console.error('Failed to mark nudge as read:', error);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'border-red-500/30 bg-red-500/10';
            case 'medium': return 'border-yellow-500/30 bg-yellow-500/10';
            case 'low': return 'border-blue-500/30 bg-blue-500/10';
            default: return 'border-white/10 bg-white/5';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'streak_reminder': return <AlertCircle className="w-5 h-5 text-orange-400" />;
            case 'achievement': return <TrendingUp className="w-5 h-5 text-green-400" />;
            case 'suggestion': return <Info className="w-5 h-5 text-blue-400" />;
            default: return <Bell className="w-5 h-5 text-purple-400" />;
        }
    };

    if (isLoading) {
        return (
            <Card className="bg-white/5 backdrop-blur-md border-white/10 p-6">
                <Skeleton className="h-8 w-48 bg-white/5 mb-4" />
                <Skeleton className="h-24 w-full bg-white/5 mb-2" />
                <Skeleton className="h-24 w-full bg-white/5" />
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-md border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-6">
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
                <div className="flex gap-2">
                    <Button
                        variant={filter === 'unread' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('unread')}
                        className={filter === 'unread' ? 'bg-purple-500' : 'bg-white/5 border-white/10'}
                    >
                        Unread
                    </Button>
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                        className={filter === 'all' ? 'bg-purple-500' : 'bg-white/5 border-white/10'}
                    >
                        All
                    </Button>
                </div>
            </div>

            {filteredNudges.length > 0 ? (
                <div className="space-y-3">
                    {filteredNudges.map((nudge: Nudge) => (
                        <div
                            key={nudge.id}
                            className={`border rounded-lg p-4 transition-all ${nudge.isRead ? 'bg-white/5 border-white/10 opacity-60' : getPriorityColor(nudge.priority)
                                }`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="mt-1">
                                        {getTypeIcon(nudge.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-white">{nudge.title}</h3>
                                            {!nudge.isRead && (
                                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-300 mb-2">{nudge.message}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="capitalize">{nudge.type.replace('_', ' ')}</span>
                                            <span>•</span>
                                            <span>{new Date(nudge.scheduledAt).toLocaleString()}</span>
                                            {nudge.priority && (
                                                <>
                                                    <span>•</span>
                                                    <span className="capitalize">{nudge.priority} priority</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {!nudge.isRead && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleMarkRead(nudge.id)}
                                        className="hover:bg-white/10"
                                    >
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">
                        {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                    </p>
                </div>
            )}
        </Card>
    );
}
