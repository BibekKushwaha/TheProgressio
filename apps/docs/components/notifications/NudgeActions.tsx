'use client';

import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SNOOZE_OPTIONS } from './notificationUtils';
import type { NudgeAction } from './notificationUtils';

interface NudgeActionsProps {
    actions: NudgeAction[];
    deepLink: string;
    taskId: string | undefined;
    onRunAction: (actionType: string) => void;
    onSnooze: (taskId: string | undefined, minutes: number, label: string) => void;
    onNavigate: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}

export function NudgeActions({
    actions,
    deepLink,
    taskId,
    onRunAction,
    onSnooze,
    onNavigate,
}: NudgeActionsProps) {
    return (
        <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Metadata-driven action buttons */}
            {actions.length > 0 && (
                <div className="flex gap-2">
                    {actions.map((action) => (
                        <Button
                            key={action.id}
                            size="sm"
                            variant="outline"
                            onClick={() => onRunAction(action.actionType)}
                            className="bg-white/5 border-white/10 hover:bg-white/10 text-xs h-8"
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            )}

            <div className="h-4 w-px bg-white/10" />

            {/* Snooze controls */}
            <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-500 px-1 font-semibold uppercase tracking-wider">
                    Snooze
                </span>
                {SNOOZE_OPTIONS.map((snooze) => (
                    <button
                        key={snooze.label}
                        onClick={() => onSnooze(taskId, snooze.value, snooze.label)}
                        className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                        {snooze.label}
                    </button>
                ))}
            </div>

            {/* Deep link */}
            <div className="ml-auto">
                <a
                    href={deepLink}
                    onClick={(e) => onNavigate(e, deepLink)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-indigo-400/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                >
                    <Link2 className="w-3 h-3" /> View
                </a>
            </div>
        </div>
    );
}
