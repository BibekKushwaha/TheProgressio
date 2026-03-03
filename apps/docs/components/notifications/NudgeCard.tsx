'use client';

import React from 'react';
import { AlertCircle, Bell, TrendingUp, Info } from 'lucide-react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Nudge } from '@repo/store';
import { NudgeRichMedia } from './NudgeRichMedia';
import { NudgeDirectReply } from './NudgeDirectReply';
import { NudgeActions } from './NudgeActions';
import {
    parseNudgeMetadata,
    resolveNudgeDeepLink,
    navigateDeepLink,
    extractProgress,
    extractRichMedia,
    extractActions,
    getPriorityClass,
    getNudgeIconType,
    formatScheduledAt,
    UUID_REGEX,
} from './notificationUtils';
import { useRouter } from 'next/navigation';

// Icon map — defined at module level, no per-render construction
const TYPE_ICON_MAP: Record<string, React.ReactNode> = {
    streak_reminder: <AlertCircle className="w-5 h-5 text-orange-400" />,
    achievement: <TrendingUp className="w-5 h-5 text-green-400" />,
    suggestion: <Info className="w-5 h-5 text-blue-400" />,
    urgency_driven: <AlertCircle className="w-5 h-5 text-red-400" />,
    digest_summary: <Bell className="w-5 h-5 text-indigo-400" />,
    default: <Bell className="w-5 h-5 text-purple-400" />,
};

interface NudgeCardProps {
    nudge: Nudge;
    onMarkRead: (id: string) => void;
    onRunAction: (nudge: Nudge, actionType: string) => void;
    onDirectReply: (nudge: Nudge, text: string) => Promise<void>;
    onSnooze: (taskId: string | undefined, minutes: number, label: string) => void;
    isReplying: boolean;
}

function NudgeCardBase({
    nudge,
    onMarkRead,
    onRunAction,
    onDirectReply,
    onSnooze,
    isReplying,
}: NudgeCardProps) {
    const router = useRouter();

    // Parse metadata once per render — not twice like the monolith did
    const metadata = parseNudgeMetadata(nudge.metadata);
    const deepLink = resolveNudgeDeepLink(metadata);
    const progress = extractProgress(metadata);
    const richMedia = extractRichMedia(metadata);
    const actions = extractActions(metadata);
    const taskId = typeof metadata.taskId === 'string' ? metadata.taskId : undefined;

    // Determine whether direct reply is available
    const metaNudgeId = typeof metadata.nudgeId === 'string' ? metadata.nudgeId : undefined;
    const canDirectReply =
        Boolean(metadata.directReplyEnabled) ||
        Boolean(taskId) ||
        (typeof metaNudgeId === 'string' && UUID_REGEX.test(metaNudgeId)) ||
        (typeof nudge.id === 'string' && UUID_REGEX.test(nudge.id));

    const iconType = getNudgeIconType(nudge.type);
    const icon = TYPE_ICON_MAP[iconType] ?? TYPE_ICON_MAP.default;

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, link: string) => {
        e.preventDefault();
        navigateDeepLink(link, router.push);
    };

    return (
        <div
            className={`border rounded-lg p-4 transition-all ${nudge.isRead
                ? 'bg-white/5 border-white/10 opacity-60'
                : getPriorityClass(nudge.priority)
                }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">{icon}</div>
                    <div className="flex-1 min-w-0">
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
                                    <span>
                                        {progress.current}/{progress.total}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-400"
                                        style={{
                                            width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {richMedia && <NudgeRichMedia media={richMedia} />}

                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="capitalize">{nudge.type.replace(/_/g, ' ')}</span>
                            <span>•</span>
                            <span>{formatScheduledAt(nudge.scheduledAt)}</span>
                            {nudge.priority && (
                                <>
                                    <span>•</span>
                                    <span className="capitalize">{nudge.priority} priority</span>
                                </>
                            )}
                        </div>

                        <NudgeActions
                            actions={actions}
                            deepLink={deepLink}
                            taskId={taskId}
                            onRunAction={(actionType) => onRunAction(nudge, actionType)}
                            onSnooze={onSnooze}
                            onNavigate={handleNavigate}
                        />

                        {canDirectReply ? (
                            <NudgeDirectReply
                                isReplying={isReplying}
                                onSend={(text) => onDirectReply(nudge, text)}
                            />
                        ) : (
                            <div className="mt-3 text-sm text-slate-400">
                                Direct reply not available for this notification
                            </div>
                        )}
                    </div>
                </div>

                {!nudge.isRead && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMarkRead(nudge.id)}
                        className="hover:bg-white/10"
                        aria-label="Mark as read"
                    >
                        <CheckCircle className="w-4 h-4 text-green-400" />
                    </Button>
                )}
            </div>
        </div>
    );
}

export const NudgeCard = React.memo(NudgeCardBase);
