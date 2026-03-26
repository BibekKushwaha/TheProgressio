'use client';

import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { Task, TaskStatus } from '@repo/store';
import { filterTasks } from '@/lib/filterTasks';
import { useRouter } from 'next/navigation';

interface TimelineViewProps {
    searchQuery: string;
    status: string;
    priority: string;
    category: string;
    sort: 'default' | 'quickWins';
    tasks: Task[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toStartOfDay = (value: Date) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const diffDays = (from: Date, to: Date) =>
    Math.floor((toStartOfDay(to).getTime() - toStartOfDay(from).getTime()) / MS_PER_DAY);

const formatTick = (value: Date) =>
    value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const estimateWorkSpanDays = (task: Task) => {
    const priorityDays = task.priority === 'HIGH' ? 4 : task.priority === 'MEDIUM' ? 3 : 2;
    const subtaskDays = task.subtasks && task.subtasks.length > 0
        ? Math.max(0, Math.ceil(task.subtasks.length / 2) - 1)
        : 0;

    return Math.min(14, priorityDays + subtaskDays);
};

const STATUS_STYLE: Record<TaskStatus, string> = {
    [TaskStatus.PENDING]: 'from-slate-500 to-slate-400 border-slate-300/30',
    [TaskStatus.IN_PROGRESS]: 'from-cyan-500 to-blue-500 border-cyan-300/30',
    [TaskStatus.COMPLETED]: 'from-emerald-500 to-green-500 border-emerald-300/30',
};

export function TimelineView({ searchQuery, status, priority, category, sort, tasks }: TimelineViewProps) {
    const router = useRouter();

    const timeline = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        const filtered = filterTasks(tasks, { searchQuery, status, priority, category, sort })
            .filter((task) => {
                if (!task.dueDate) return false;
                const d = new Date(task.dueDate);
                return d >= monthStart && d <= monthEnd;
            })
            .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());

        const today = toStartOfDay(now);
        const rangeStart = monthStart;
        const rangeEnd = monthEnd;
        const totalDays = diffDays(rangeStart, rangeEnd) + 1;
        const nowPercent = ((now.getTime() - rangeStart.getTime()) / (totalDays * MS_PER_DAY)) * 100;

        if (filtered.length === 0) {
            return {
                rangeStart,
                rangeEnd,
                totalDays,
                nowPercent,
                bars: [] as Array<{
                    task: Task;
                    leftPercent: number;
                    widthPercent: number;
                    duePercent: number;
                    dueLabel: string;
                    isOverdue: boolean;
                }>,
                ticks: [monthStart, addDays(monthStart, 7), addDays(monthStart, 14), addDays(monthStart, 21), monthEnd],
            };
        }

        // Monthly ticks: Weekly intervals
        const ticks: Date[] = [];
        let cursor = new Date(monthStart);
        while (cursor <= monthEnd) {
            ticks.push(new Date(cursor));
            cursor = addDays(cursor, 7);
        }
        const lastTick = ticks[ticks.length - 1];
        if (lastTick && lastTick.getTime() !== monthEnd.getTime()) {
            ticks.push(monthEnd);
        }

        const bars = filtered.map((task) => {
            const dueDate = toStartOfDay(new Date(task.dueDate as string));
            const spanDays = estimateWorkSpanDays(task);
            const plannedStart = addDays(dueDate, -(spanDays - 1));
            const effectiveStart = plannedStart < rangeStart ? rangeStart : plannedStart;

            const startOffset = Math.max(diffDays(rangeStart, effectiveStart), 0);
            const dueOffset = Math.max(diffDays(rangeStart, dueDate), 0);
            const widthDays = Math.max(diffDays(effectiveStart, dueDate) + 1, 1);

            const isOverdue = task.status !== TaskStatus.COMPLETED && dueDate < today;

            return {
                task,
                leftPercent: (startOffset / totalDays) * 100,
                widthPercent: Math.max((widthDays / totalDays) * 100, 3),
                duePercent: ((dueOffset + 0.95) / totalDays) * 100,
                dueLabel: formatTick(dueDate),
                isOverdue,
            };
        });

        return { rangeStart, rangeEnd, totalDays, bars, ticks, nowPercent };
    }, [tasks, searchQuery, status, priority, category, sort]);

    const showYear = timeline.totalDays > 365;
    const formatLabel = (d: Date) => showYear
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : formatTick(d);

    if (timeline.bars.length === 0) {
        return (
            <div className="max-w-7xl mx-auto rounded-3xl border border-white/10 bg-slate-900/50 p-12 text-center backdrop-blur-xl">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                    <CalendarDays className="h-8 w-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white">No tasks this month</h3>
                <p className="mt-2 text-slate-400 max-w-sm mx-auto">There are no tasks with deadlines in {new Date().toLocaleDateString('en-US', { month: 'long' })}. Try adjusting your filters or adding new dated tasks.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Monthly Roadmap</h3>
                    <p className="text-sm text-slate-400 font-medium">
                        Showing deadlines for <span className="text-cyan-400">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-500" /> Planned</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-500" /> In Progress</span>
                    <span className="flex items-center gap-1.5"><div className="w-px h-3 bg-white/40" /> Due Date</span>
                </div>
            </div>

            {/* Timeline Header */}
            <div className="grid grid-cols-[30%_10%_60%] md:grid-cols-[25%_10%_65%] lg:grid-cols-[20%_8%_72%] mb-4 items-end">
                <div className="col-start-3 relative h-10 border-b border-white/5">
                    {/* Now Indicator (Header part) */}
                    {timeline.nowPercent >= 0 && timeline.nowPercent <= 100 && (
                        <div
                            className="absolute bottom-0 z-20 flex flex-col items-center"
                            style={{ left: `${timeline.nowPercent}%` }}
                        >
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-500/10 px-1 rounded mb-1">Now</span>
                            <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                        </div>
                    )}

                    {timeline.ticks.map((tick) => {
                        const offset = (diffDays(timeline.rangeStart, tick) / timeline.totalDays) * 100;
                        if (offset > 100) return null;
                        return (
                            <div key={tick.toISOString()} className="absolute bottom-0" style={{ left: `${offset}%` }}>
                                <div className="h-3 w-px bg-white/20 mb-1" />
                                <span className="block text-[9px] font-bold text-slate-500 -translate-x-1/2 whitespace-nowrap uppercase tracking-tighter">
                                    {formatLabel(tick)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Timeline Rows Container */}
            <div className="relative space-y-3">
                {/* Now Vertical Line (Responsive Overlay) */}
                {timeline.nowPercent >= 0 && timeline.nowPercent <= 100 && (
                    <div className="absolute inset-0 z-20 pointer-events-none grid grid-cols-[30%_10%_60%] md:grid-cols-[25%_10%_65%] lg:grid-cols-[20%_8%_72%] gap-2">
                        <div className="col-start-3 relative h-full">
                            <div
                                className="absolute inset-y-0 w-px bg-rose-500/40"
                                style={{ left: `${timeline.nowPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {timeline.bars.map((bar) => (
                    <div key={bar.task.id} className="grid grid-cols-[30%_10%_60%] md:grid-cols-[25%_10%_65%] lg:grid-cols-[20%_8%_72%] gap-2 items-center group cursor-pointer"
                        onClick={() => router.push(`/tasks/${bar.task.id}`)}>

                        <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                                {bar.task.title}
                                {bar.isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />}
                            </div>
                        </div>

                        <div className="text-[10px] font-medium text-slate-500 whitespace-nowrap bg-white/5 rounded px-1.5 py-0.5 w-fit justify-self-center">
                            {formatTick(new Date(bar.task.dueDate as string))}
                        </div>

                        <div className="relative h-10 rounded-xl border border-white/5 bg-white/[0.02] group-hover:bg-white/[0.04] transition-all overflow-hidden flex items-center">
                            {/* Now Line Shadow (inside row) */}
                            {timeline.nowPercent >= 0 && timeline.nowPercent <= 100 && (
                                <div
                                    className="absolute inset-y-0 w-px bg-rose-500/20 z-0 pointer-events-none"
                                    style={{ left: `${timeline.nowPercent}%` }}
                                />
                            )}

                            {/* Gantt Bar */}
                            <div
                                style={{
                                    left: `${bar.leftPercent}%`,
                                    width: `${bar.widthPercent}%`,
                                }}
                                className={`absolute inset-y-1.5 rounded-lg border shadow-lg bg-gradient-to-r flex items-center px-2 min-w-[24px] z-10 transition-all ${bar.isOverdue
                                    ? 'from-rose-600 to-rose-400 border-rose-300/40'
                                    : STATUS_STYLE[bar.task.status] || STATUS_STYLE.PENDING
                                    }`}
                            >
                                {(bar.widthPercent > 12 || bar.isOverdue) && (
                                    <span className="text-[9px] font-black text-white/90 truncate uppercase tracking-tighter">
                                        {bar.isOverdue ? 'Overdue' : bar.task.status}
                                    </span>
                                )}
                            </div>

                            {/* Due Date Marker */}
                            <div
                                className="absolute inset-y-0 w-px bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.5)] z-20"
                                style={{ left: `${bar.duePercent}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
