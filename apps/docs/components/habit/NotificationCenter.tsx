'use client';

import { useState } from 'react';
import {
    useGetNudgesQuery,
    useMarkNudgeAsReadMutation,
    useMarkAllNudgesAsReadMutation,
    usePostNotificationDirectReplyMutation,
    useUpdateTaskMutation,
    useGenerateSubtasksMutation,
    TaskStatus,
} from '@repo/store';
import type { Nudge } from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCircle, AlertCircle, Info, TrendingUp, Link2, Send, Award, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const parseNudgeMetadata = (metadata: Nudge['metadata']): Record<string, unknown> => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
        try {
            const parsed = JSON.parse(metadata) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            return parsed as Record<string, unknown>;
        } catch {
            return {};
        }
    }

    if (typeof metadata === 'object' && !Array.isArray(metadata)) {
        return metadata as Record<string, unknown>;
    }

    return {};
};

const toProgress = (metadata: Record<string, unknown>) => {
    const anatomy = metadata.anatomy;
    if (!anatomy || typeof anatomy !== 'object' || Array.isArray(anatomy)) return null;
    const progress = (anatomy as Record<string, unknown>).progress;
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return null;

    const current = Number((progress as Record<string, unknown>).current ?? 0);
    const total = Number((progress as Record<string, unknown>).total ?? 0);
    const label = (progress as Record<string, unknown>).label;

    if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
    return { current, total, label: typeof label === 'string' ? label : undefined };
};

export function NotificationCenter() {
    const { data, isLoading } = useGetNudgesQuery();
    const [markRead] = useMarkNudgeAsReadMutation();
    const [markAllRead, { isLoading: isMarkingAllRead }] = useMarkAllNudgesAsReadMutation();
    const [postDirectReply, { isLoading: isReplying }] = usePostNotificationDirectReplyMutation();
    const [updateTask] = useUpdateTaskMutation();
    const [generateSubtasks] = useGenerateSubtasksMutation();
    const [filter, setFilter] = useState<'all' | 'unread' | string>('all');
    const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});

    const nudges = data?.nudges || [];
    const filteredNudges = nudges.filter((n: Nudge) => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'all') return true;
        return n.type === filter;
    });

    const unreadCount = nudges.filter((n: Nudge) => !n.isRead).length;

    const handleMarkRead = async (id: string) => {
        try {
            await markRead(id).unwrap();
        } catch (error) {
            console.error('Failed to mark nudge as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllRead().unwrap();
        } catch (error) {
            console.error('Failed to mark all nudges as read:', error);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch ((priority || '').toLowerCase()) {
            case 'high': return 'border-red-500/30 bg-red-500/10';
            case 'medium': return 'border-yellow-500/30 bg-yellow-500/10';
            case 'low': return 'border-blue-500/30 bg-blue-500/10';
            default: return 'border-white/10 bg-white/5';
        }
    };

    const getTypeIcon = (type: string) => {
        switch ((type || '').toLowerCase()) {
            case 'streak_reminder': return <AlertCircle className="w-5 h-5 text-orange-400" />;
            case 'achievement': return <TrendingUp className="w-5 h-5 text-green-400" />;
            case 'suggestion': return <Info className="w-5 h-5 text-blue-400" />;
            case 'urgency_driven': return <AlertCircle className="w-5 h-5 text-red-400" />;
            case 'digest_summary': return <Bell className="w-5 h-5 text-indigo-400" />;
            default: return <Bell className="w-5 h-5 text-purple-400" />;
        }
    };

    const formatScheduledAt = (value: string) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
    };

    const handleDirectReply = async (nudge: Nudge) => {
        const text = replyDraft[nudge.id]?.trim();
        if (!text) return;

        const metadata = parseNudgeMetadata(nudge.metadata);
        const taskId = typeof metadata.taskId === 'string' ? metadata.taskId : undefined;

        try {
            await postDirectReply({ nudgeId: nudge.id, ...(taskId ? { taskId } : {}), text }).unwrap();
            setReplyDraft((prev) => ({ ...prev, [nudge.id]: '' }));
        } catch (error) {
            console.error('Failed direct reply:', error);
        }
    };

    const runAction = async (nudge: Nudge, actionType: string) => {
        const metadata = parseNudgeMetadata(nudge.metadata);
        const taskId = typeof metadata.taskId === 'string' ? metadata.taskId : undefined;

        try {
            if (actionType === 'MARK_COMPLETED' && taskId) {
                await updateTask({ id: taskId, status: TaskStatus.COMPLETED }).unwrap();
                await markRead(nudge.id).unwrap();
                return;
            }

            if (actionType === 'SNOOZE_1_HOUR' && taskId) {
                const dueDate = new Date();
                dueDate.setHours(dueDate.getHours() + 1);
                await updateTask({ id: taskId, dueDate: dueDate.toISOString() }).unwrap();
                return;
            }

            if (actionType === 'BREAK_IT_DOWN' && taskId) {
                await generateSubtasks(taskId).unwrap();
                return;
            }
        } catch (error) {
            console.error('Action failed:', error);
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
                    {unreadCount > 0 && (
                        <Button
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
            </div>

            {/* Categories Filter */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {[
                    { id: 'all', label: 'All', icon: Bell },
                    { id: 'streak_reminder', label: 'Streaks', icon: TrendingUp },
                    { id: 'urgency_driven', label: 'Priority', icon: AlertCircle },
                    { id: 'suggestion', label: 'Tips', icon: Sparkles },
                    { id: 'achievement', label: 'Awards', icon: Award },
                ].map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setFilter(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium transition-all whitespace-nowrap ${filter === cat.id
                            ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <cat.icon className="w-3.5 h-3.5" />
                        {cat.label}
                    </button>
                ))}
            </div>

            {filteredNudges.length > 0 ? (
                <div className="space-y-3">
                    {filteredNudges.map((nudge: Nudge) => (
                        (() => {
                            const metadata = parseNudgeMetadata(nudge.metadata);
                            const deepLink = typeof metadata.deepLink === 'string' ? metadata.deepLink : '/dashboard';
                            const progress = toProgress(metadata);
                            const actionsRaw = Array.isArray(metadata.actions) ? metadata.actions : [];
                            const actions = actionsRaw
                                .filter((item): item is { id: string; label: string; actionType: string } => {
                                    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
                                    const cast = item as Record<string, unknown>;
                                    return typeof cast.id === 'string' && typeof cast.label === 'string' && typeof cast.actionType === 'string';
                                })
                                .slice(0, 3);

                            const snoozeActions = [
                                { label: '30m', value: 30 },
                                { label: '2h', value: 120 },
                                { label: '1d', value: 1440 }
                            ];

                            const anatomy = metadata.anatomy;
                            const richMedia = anatomy && typeof anatomy === 'object' && !Array.isArray(anatomy)
                                ? (anatomy as Record<string, unknown>).richMedia
                                : null;
                            const richMediaUrl = richMedia && typeof richMedia === 'object' && !Array.isArray(richMedia)
                                ? (richMedia as Record<string, unknown>).url
                                : null;
                            const richMediaType = richMedia && typeof richMedia === 'object' && !Array.isArray(richMedia)
                                ? (richMedia as Record<string, unknown>).type
                                : null;

                            return (
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

                                                {progress && (
                                                    <div className="mb-3">
                                                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                                            <span>{progress.label || 'Progress'}</span>
                                                            <span>{progress.current}/{progress.total}</span>
                                                        </div>
                                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
                                                                style={{ width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {typeof richMediaUrl === 'string' && (
                                                    <div className="mb-3 rounded-lg border border-white/10 overflow-hidden bg-black/20">
                                                        {String(richMediaType).toUpperCase() === 'VIDEO' ? (
                                                            <video src={richMediaUrl} controls className="w-full max-h-52 object-cover" />
                                                        ) : (
                                                            /* eslint-disable-next-line @next/next/no-img-element */
                                                            <img src={richMediaUrl} alt="Notification media" className="w-full max-h-52 object-cover" />
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="capitalize">{nudge.type.replace('_', ' ')}</span>
                                                    <span>•</span>
                                                    <span>{formatScheduledAt(nudge.scheduledAt)}</span>
                                                    {nudge.priority && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="capitalize">{nudge.priority} priority</span>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                                    <div className="flex gap-2">
                                                        {actions.map((action) => (
                                                            <Button
                                                                key={action.id}
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => runAction(nudge, action.actionType)}
                                                                className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-8"
                                                            >
                                                                {action.label}
                                                            </Button>
                                                        ))}
                                                    </div>

                                                    <div className="h-4 w-px bg-white/10" />

                                                    <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-lg border border-white/5">
                                                        <span className="text-[10px] text-slate-500 px-1 font-semibold uppercase tracking-wider">Snooze</span>
                                                        {snoozeActions.map((snooze) => (
                                                            <button
                                                                key={snooze.label}
                                                                onClick={() => {
                                                                    const dueDate = new Date();
                                                                    dueDate.setMinutes(dueDate.getMinutes() + snooze.value);
                                                                    updateTask({
                                                                        id: (metadata as Record<string, unknown>).taskId as string,
                                                                        dueDate: dueDate.toISOString()
                                                                    });
                                                                    toast.success(`Snoozed for ${snooze.label}`);
                                                                }}
                                                                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                                            >
                                                                {snooze.label}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="ml-auto flex gap-2">
                                                        <a href={deepLink} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                                                            <Link2 className="w-3 h-3" /> View
                                                        </a>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={replyDraft[nudge.id] || ''}
                                                        onChange={(event) => setReplyDraft((prev) => ({ ...prev, [nudge.id]: event.target.value }))}
                                                        placeholder="Quick reply from notification..."
                                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                                                        maxLength={240}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleDirectReply(nudge)}
                                                        disabled={isReplying || !(replyDraft[nudge.id] || '').trim()}
                                                        className="bg-indigo-500 hover:bg-indigo-600"
                                                    >
                                                        <Send className="w-3 h-3" />
                                                    </Button>
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
                            );
                        })()
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
