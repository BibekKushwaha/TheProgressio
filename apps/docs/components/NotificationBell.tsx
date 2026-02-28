'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useGetNudgesQuery, useMarkNudgeAsReadMutation, useMarkAllNudgesAsReadMutation } from '@repo/store';
import type { Nudge } from '@repo/store';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { NUDGE_POLL_INTERVAL_MS } from '@/constant';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isVisible = usePageVisibility();
    const { data } = useGetNudgesQuery(undefined, {
        pollingInterval: isVisible ? NUDGE_POLL_INTERVAL_MS : 0,
        refetchOnFocus: true,
    });
    const [markAsRead] = useMarkNudgeAsReadMutation();
    const [markAllAsRead] = useMarkAllNudgesAsReadMutation();

    const nudges = data?.nudges || [];
    const unreadCount = nudges.filter((n: Nudge) => !n.isRead).length;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = async (id: string) => {
        await markAsRead(id);
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH': return 'border-l-red-500';
            case 'MEDIUM': return 'border-l-amber-500';
            default: return 'border-l-blue-500';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-slate-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <h3 className="font-semibold text-sm text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {nudges.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-sm">
                                No notifications
                            </div>
                        ) : (
                            nudges.slice(0, 10).map((nudge: Nudge) => (
                                <div
                                    key={nudge.id}
                                    onClick={() => !nudge.isRead && handleMarkRead(nudge.id)}
                                    className={`px-4 py-3 border-l-2 ${getPriorityColor(nudge.priority)} cursor-pointer hover:bg-white/5 transition-colors ${!nudge.isRead ? 'bg-white/[0.03]' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!nudge.isRead ? 'font-semibold text-white' : 'text-slate-400'}`}>
                                                {nudge.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                {nudge.message}
                                            </p>
                                        </div>
                                        {!nudge.isRead && (
                                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 shrink-0" />
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
