'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CalendarClock, Flame, ShieldAlert } from 'lucide-react';
import { useGetMorningBriefingQuery, useGetTasksQuery, TaskStatus } from '@repo/store';
import { Skeleton } from '@/components/ui/skeleton';

type RiskItem = {
    key: string;
    label: string;
    value: number;
    href: string;
    tone: 'critical' | 'warning' | 'info';
};

export function AtRiskCard() {
    const { data, isLoading } = useGetMorningBriefingQuery();
    const pendingTasksQueryArgs = useMemo(() => ({ page: 1, limit: 25, status: TaskStatus.PENDING }), []);
    const { data: tasks } = useGetTasksQuery(pendingTasksQueryArgs);

    const todayStart = (() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    })();

    const overdueCount = useMemo(
        () => (tasks ?? []).filter((task) => task.dueDate && new Date(task.dueDate).getTime() < todayStart).length,
        [tasks, todayStart]
    );

    const briefing = data?.briefing;
    const upcomingExamRisk = (briefing?.upcomingExams ?? []).filter((exam) => exam.daysUntil <= 7).length;

    const riskItems = useMemo<RiskItem[]>(() => {
        const items: RiskItem[] = [
            {
                key: 'overdue',
                label: 'Overdue tasks',
                value: overdueCount,
                href: '/tasks',
                tone: 'critical',
            },
            {
                key: 'streaks',
                label: 'Streaks at risk',
                value: briefing?.streaksAtRisk?.length ?? 0,
                href: '/habits',
                tone: 'warning',
            },
            {
                key: 'conflicts',
                label: 'Schedule conflicts',
                value: briefing?.conflicts?.length ?? 0,
                href: '/calendar',
                tone: 'warning',
            },
            {
                key: 'exams',
                label: 'Exams in 7 days',
                value: upcomingExamRisk,
                href: '/exam-warroom/overview',
                tone: 'info',
            },
        ];

        return items.filter((item) => item.value > 0);
    }, [briefing?.conflicts?.length, briefing?.streaksAtRisk?.length, overdueCount, upcomingExamRisk]);

    const topRisk = riskItems[0];

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-orange-500/5 p-5">
                <Skeleton className="mb-3 h-5 w-36 bg-white/10" />
                <Skeleton className="mb-2 h-4 w-full bg-white/5" />
                <Skeleton className="h-4 w-3/4 bg-white/5" />
            </div>
        );
    }

    if (!topRisk) return null;

    const summaryText =
        topRisk.key === 'overdue'
            ? 'You have overdue work that can snowball if it stays untouched.'
            : topRisk.key === 'streaks'
                ? 'A habit streak is about to break — a quick check-in today can save it.'
                : topRisk.key === 'conflicts'
                    ? 'Two or more commitments are colliding on your schedule.'
                    : 'An exam is close enough that your revision plan should tighten now.';

    return (
        <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-orange-500/5 p-5">
            <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                <h3 className="font-bold text-white">At Risk Today</h3>
                <span className="rounded-full border border-rose-500/25 bg-rose-500/15 px-2 py-0.5 text-[11px] text-rose-300">
                    Needs attention
                </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-300">{summaryText}</p>

            <div className="mt-4 grid grid-cols-1 gap-2">
                {riskItems.slice(0, 4).map((item) => {
                    const icon = item.key === 'overdue'
                        ? AlertTriangle
                        : item.key === 'streaks'
                            ? Flame
                            : CalendarClock;
                    const Icon = icon;

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10 hover:border-white/20"
                        >
                            <div className={`rounded-lg p-2 ${item.tone === 'critical' ? 'bg-rose-500/15 text-rose-400' : item.tone === 'warning' ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-white">{item.value} {item.label.toLowerCase()}</div>
                                <div className="text-xs text-slate-400">Review and resolve this before it compounds.</div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-500" />
                        </Link>
                    );
                })}
            </div>

            <Link
                href={topRisk.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rose-300 transition-colors hover:text-rose-200"
            >
                Resolve the highest-priority risk
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}