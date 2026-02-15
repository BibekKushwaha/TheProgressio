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
                ticks: [],
            };
        }

        const dueDates = filtered.map((task) => toStartOfDay(new Date(task.dueDate as string)));
        const earliestDue = dueDates[0] as Date;
        const latestDue = dueDates[dueDates.length - 1] as Date;

        const rangeStart = earliestDue < today ? addDays(earliestDue, -2) : today;
        const rangeEnd = addDays(latestDue, 4);
        const totalDays = Math.max(diffDays(rangeStart, rangeEnd) + 1, 1);

        // Dynamic tick interval based on totalDays
        let tickStep = 7;
        if (totalDays > 180) tickStep = 30;
        else if (totalDays > 60) tickStep = 14;
        else if (totalDays < 14) tickStep = 2;

        const ticks: Date[] = [];
        let cursor = toStartOfDay(rangeStart);
        while (cursor <= rangeEnd) {
            ticks.push(new Date(cursor));
            cursor = addDays(cursor, tickStep);
        }

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

        return { rangeStart, rangeEnd, totalDays, bars, ticks };
    }, [tasks, searchQuery, status, priority, category]);

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
                <h3 className="text-xl font-bold text-white">No dated tasks for timeline</h3>
                <p className="mt-2 text-slate-400 max-w-sm mx-auto">Add due dates to your tasks to visualize your roadmap and detect potential workload bottlenecks.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Timeline / Gantt View</h3>
                    <p className="text-sm text-slate-400 font-medium">
                        Focused schedule from <span className="text-cyan-400">{formatLabel(timeline.rangeStart)}</span> to <span className="text-indigo-400">{formatLabel(timeline.rangeEnd)}</span>
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

            {/* Timeline Rows */}
            <div className="space-y-3">
                {timeline.bars.map((bar) => (
                    <div key={bar.task.id} className="grid grid-cols-[30%_10%_60%] md:grid-cols-[25%_10%_65%] lg:grid-cols-[20%_8%_72%] gap-2 items-center group cursor-pointer"
                        onClick={() => router.push(`/tasks/${bar.task.id}`)}>

                        <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{bar.task.title}</div>
                        </div>

                        <div className="text-[10px] font-medium text-slate-500 whitespace-nowrap bg-white/5 rounded px-1.5 py-0.5 w-fit justify-self-center">
                            {formatTick(new Date(bar.task.dueDate as string))}
                        </div>

                        <div className="relative h-10 rounded-xl border border-white/5 bg-white/[0.02] group-hover:bg-white/[0.04] transition-all overflow-hidden">
                            {/* Gantt Bar */}
                            <div
                                style={{
                                    left: `${bar.leftPercent}%`,
                                    width: `${bar.widthPercent}%`,
                                }}
                                className={`absolute inset-y-1.5 rounded-lg border shadow-lg bg-gradient-to-r flex items-center px-2 min-w-[24px] ${STATUS_STYLE[bar.task.status] || STATUS_STYLE.PENDING}`}
                            >
                                {bar.widthPercent > 15 && (
                                    <span className="text-[9px] font-black text-white/90 truncate uppercase tracking-tighter">
                                        {bar.task.status}
                                    </span>
                                )}
                            </div>

                            {/* Due Date Marker */}
                            <div
                                className="absolute inset-y-0 w-px bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.5)] z-10"
                                style={{ left: `${bar.duePercent}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
