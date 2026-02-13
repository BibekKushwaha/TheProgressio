'use client';

import { useMemo } from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { Task, TaskStatus } from '@repo/store';
import { filterTasks } from '@/lib/filterTasks';
import { useRouter } from 'next/navigation';

interface TimelineViewProps {
    searchQuery: string;
    status: string;
    priority: string;
    category: string;
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

export function TimelineView({ searchQuery, status, priority, category, tasks }: TimelineViewProps) {
    const router = useRouter();

    const timeline = useMemo(() => {
        const filtered = filterTasks(tasks, { searchQuery, status, priority, category })
            .filter((task) => Boolean(task.dueDate))
            .sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());

        const today = toStartOfDay(new Date());

        if (filtered.length === 0) {
            const rangeStart = today;
            const rangeEnd = addDays(today, 14);
            return {
                rangeStart,
                rangeEnd,
                totalDays: diffDays(rangeStart, rangeEnd) + 1,
                bars: [] as Array<{
                    task: Task;
                    leftPercent: number;
                    widthPercent: number;
                    duePercent: number;
                    dueLabel: string;
                }>,
                ticks: [rangeStart, addDays(rangeStart, 7), rangeEnd],
            };
        }

        const dueDates = filtered
            .map((task) => toStartOfDay(new Date(task.dueDate as string)));

        const earliestDue = dueDates[0] as Date;
        const latestDue = dueDates[dueDates.length - 1] as Date;

        const rangeStart = earliestDue < today ? addDays(earliestDue, -2) : today;
        const rangeEnd = addDays(latestDue, 4);
        const totalDays = Math.max(diffDays(rangeStart, rangeEnd) + 1, 1);

        const bars = filtered.map((task) => {
            const dueDate = toStartOfDay(new Date(task.dueDate as string));
            const spanDays = estimateWorkSpanDays(task);
            const plannedStart = addDays(dueDate, -(spanDays - 1));
            const effectiveStart = plannedStart < rangeStart ? rangeStart : plannedStart;

            const startOffset = Math.max(diffDays(rangeStart, effectiveStart), 0);
            const dueOffset = Math.max(diffDays(rangeStart, dueDate), 0);
            const widthDays = Math.max(diffDays(effectiveStart, dueDate) + 1, 1);

            return {
                task,
                leftPercent: (startOffset / totalDays) * 100,
                widthPercent: Math.max((widthDays / totalDays) * 100, 3),
                duePercent: (dueOffset / totalDays) * 100,
                dueLabel: formatTick(dueDate),
            };
        });

        const ticks: Date[] = [];
        let cursor = toStartOfDay(rangeStart);
        while (cursor <= rangeEnd) {
            ticks.push(new Date(cursor));
            cursor = addDays(cursor, 7);
        }
        if (ticks.length === 0 || ticks[ticks.length - 1]!.getTime() !== rangeEnd.getTime()) {
            ticks.push(rangeEnd);
        }

        return { rangeStart, rangeEnd, totalDays, bars, ticks };
    }, [tasks, searchQuery, status, priority, category]);

    if (timeline.bars.length === 0) {
        return (
            <div className="max-w-7xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <CalendarDays className="mx-auto h-10 w-10 text-slate-500" />
                <h3 className="mt-3 text-lg font-semibold text-white">No dated tasks for timeline view</h3>
                <p className="mt-1 text-sm text-slate-400">Add due dates to tasks to see a Gantt-style plan.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white">Timeline / Gantt View</h3>
                    <p className="text-xs text-slate-400 mt-1">
                        {formatTick(timeline.rangeStart)} to {formatTick(timeline.rangeEnd)}
                    </p>
                </div>
            </div>

            <div className="ml-[42%] md:ml-[34%] lg:ml-[28%] mb-2 relative h-8">
                {timeline.ticks.map((tick) => {
                    const offset = (diffDays(timeline.rangeStart, tick) / timeline.totalDays) * 100;
                    return (
                        <div key={tick.toISOString()} className="absolute top-0" style={{ left: `${offset}%` }}>
                            <div className="h-2 w-px bg-white/25" />
                            <span className="mt-1 block text-[10px] text-slate-400 -translate-x-1/2">{formatTick(tick)}</span>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-2">
                {timeline.bars.map((bar) => (
                    <div key={bar.task.id} className="grid grid-cols-[42%_58%] md:grid-cols-[34%_66%] lg:grid-cols-[28%_72%] gap-3 items-center">
                        <button
                            onClick={() => router.push(`/planner/${bar.task.id}`)}
                            className="text-left rounded-lg border border-white/10 bg-black/20 px-3 py-2 hover:bg-black/30 transition-colors"
                        >
                            <div className="truncate text-sm font-semibold text-white">{bar.task.title}</div>
                            <div className="mt-1 text-[11px] text-slate-400 inline-flex items-center gap-1">
                                Due {bar.dueLabel}
                                <ChevronRight className="h-3 w-3" />
                            </div>
                        </button>

                        <div className="relative h-9 rounded-lg border border-white/10 bg-black/20 overflow-hidden">
                            <div
                                style={{
                                    left: `${bar.leftPercent}%`,
                                    width: `${bar.widthPercent}%`,
                                }}
                                className={`absolute inset-y-1 rounded-md border bg-gradient-to-r ${STATUS_STYLE[bar.task.status] || STATUS_STYLE.PENDING}`}
                            />

                            <div
                                className="absolute inset-y-0 w-px bg-white/40"
                                style={{ left: `${bar.duePercent}%` }}
                                title={`Due: ${bar.dueLabel}`}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
