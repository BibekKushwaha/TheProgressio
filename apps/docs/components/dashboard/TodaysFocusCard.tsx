'use client';

/**
 * TodaysFocusCard — the hero anchor widget on the dashboard.
 *
 * Answers the single most important question for the student:
 *   "What are the top 3 things I should do right now?"
 *
 * Data is sourced from the same pending-tasks endpoint used by
 * MorningBriefing so there is no extra network cost when both are mounted.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { Target, ArrowRight, Zap } from 'lucide-react';
import { useGetTasksQuery, TaskStatus, type Task } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

// ── priority helpers ───────────────────────────────────────────────────────
const PRIORITY_ORDER: Record<string, number> = {
    URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3, ROUTINE: 3,
};

const PRIORITY_STYLE: Record<string, { dot: string; label: string; badge: string }> = {
    URGENT: { dot: 'bg-rose-500',    label: 'High',   badge: 'text-rose-400    bg-rose-500/10    border-rose-500/20'    },
    HIGH:   { dot: 'bg-rose-500',    label: 'High',   badge: 'text-rose-400    bg-rose-500/10    border-rose-500/20'    },
    MEDIUM: { dot: 'bg-amber-400',   label: 'Medium', badge: 'text-amber-400   bg-amber-500/10   border-amber-500/20'   },
    LOW:    { dot: 'bg-emerald-500', label: 'Low',    badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    ROUTINE:{ dot: 'bg-emerald-500', label: 'Low',    badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
};

function getStyle(priority: string) {
    return PRIORITY_STYLE[priority] ?? PRIORITY_STYLE['MEDIUM']!;
}

// ── component ──────────────────────────────────────────────────────────────
export function TodaysFocusCard() {
    const { data: allTasks, isLoading } = useGetTasksQuery({ page: 1, limit: 30, status: TaskStatus.PENDING });

    // Compute boundaries once per render (correct across midnight)
    const { todayStart, todayEnd } = useMemo(() => {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return { todayStart: start, todayEnd: start + 24 * 60 * 60 * 1000 };
    }, []);

    /**
     * Top 3 tasks:
     *  1. Tasks due today, sorted by priority
     *  2. Then upcoming tasks, sorted by priority + due date
     * Overdue tasks are intentionally excluded here — they surface via AmbientNudge.
     */
    const { top3, totalPending } = useMemo(() => {
        const tasks: Task[] = Array.isArray(allTasks) ? allTasks : [];
        const pending = tasks.filter(t => t.status !== TaskStatus.COMPLETED);

        const dueToday = pending.filter(t => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate).getTime();
            return d >= todayStart && d < todayEnd;
        });
        const upcoming = pending.filter(t => {
            if (!t.dueDate) return false;
            return new Date(t.dueDate).getTime() >= todayEnd;
        });
        const noDueDate = pending.filter(t => !t.dueDate);

        const sort = (arr: Task[]) =>
            [...arr].sort((a, b) => {
                const pa = PRIORITY_ORDER[a.priority] ?? 3;
                const pb = PRIORITY_ORDER[b.priority] ?? 3;
                if (pa !== pb) return pa - pb;
                if (a.dueDate && b.dueDate)
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                if (a.dueDate) return -1;
                if (b.dueDate) return 1;
                return 0;
            });

        const top3 = [...sort(dueToday), ...sort(upcoming), ...sort(noDueDate)].slice(0, 3);
        return { top3, totalPending: pending.length };
    }, [allTasks, todayStart, todayEnd]);

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-indigo-500/20 rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20 shrink-0">
                        <Target className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white leading-tight">Today&apos;s Focus</h2>
                        <p className="text-xs text-slate-400">Your top {Math.min(totalPending, 3)} priority tasks</p>
                    </div>
                </div>

                <Link
                    href="/focus-session"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                    <Zap className="w-3.5 h-3.5" />
                    Start Focus
                </Link>
            </div>

            {/* Task list */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-12 rounded-xl w-full bg-white/5" />
                    ))}
                </div>
            ) : top3.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-slate-400 text-sm mb-2">No pending tasks yet — great time to plan ahead!</p>
                    <Link
                        href="/createtask"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        Add your first task <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {top3.map((task) => {
                        const style = getStyle(task.priority);
                        const dueTs = task.dueDate ? new Date(task.dueDate).getTime() : null;
                        const isOverdue = dueTs !== null && dueTs < todayStart;
                        const isDueToday = dueTs !== null && dueTs >= todayStart && dueTs < todayEnd;

                        return (
                            <Link
                                key={task.id}
                                href="/tasks"
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                            >
                                {/* Priority dot */}
                                <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />

                                {/* Title */}
                                <span className="flex-1 text-sm text-slate-200 truncate">{task.title}</span>

                                {/* Due badge */}
                                {isOverdue && (
                                    <span className="text-[10px] font-bold text-rose-400 shrink-0">Overdue</span>
                                )}
                                {isDueToday && !isOverdue && (
                                    <span className="text-[10px] font-semibold text-amber-400/80 shrink-0">Due today</span>
                                )}

                                {/* Priority badge */}
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${style.badge}`}>
                                    {style.label}
                                </span>

                                <ArrowRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </Link>
                        );
                    })}

                    {/* Overflow link */}
                    {totalPending > 3 && (
                        <Link
                            href="/tasks"
                            className="flex items-center justify-center gap-1.5 pt-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            +{totalPending - 3} more pending tasks
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
