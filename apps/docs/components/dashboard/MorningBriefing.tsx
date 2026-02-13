'use client';

import { useGetMorningBriefingQuery, useGetTasksQuery } from '@repo/store';
import { Sun, BookOpen, Flame, AlertTriangle, ChevronRight, Clock, Zap } from 'lucide-react';
import Link from 'next/link';

export function MorningBriefing() {
    const { data, isLoading } = useGetMorningBriefingQuery();
    const { data: allTasks } = useGetTasksQuery({ page: 1, limit: 500 });
    const briefing = data?.briefing;
    type UpcomingExam = { title: string; daysUntil: number };
    const upcomingExams = (briefing?.upcomingExams ?? []) as UpcomingExam[];

    // Compute Top 3 Priority Tasks: overdue first, then by priority + due date
    const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const top3Tasks = (allTasks || [])
        .filter(t => t.status !== 'COMPLETED')
        .sort((a, b) => {
            const now = Date.now();
            const aOverdue = a.dueDate && new Date(a.dueDate).getTime() < now ? -1 : 0;
            const bOverdue = b.dueDate && new Date(b.dueDate).getTime() < now ? -1 : 0;
            if (aOverdue !== bOverdue) return aOverdue - bOverdue;
            const aPri = priorityOrder[a.priority] ?? 3;
            const bPri = priorityOrder[b.priority] ?? 3;
            if (aPri !== bPri) return aPri - bPri;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            return 0;
        })
        .slice(0, 3);

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-5 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-40 mb-3" />
                <div className="h-4 bg-white/5 rounded w-full mb-2" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
            </div>
        );
    }

    if (!briefing) return null;

    return (
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
                <Sun className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white">Morning Briefing</h3>
            </div>

            <div className="space-y-2.5 text-sm">
                {briefing.dueTasks > 0 && (
                    <Link href="/planner" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors group">
                        <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                        <span><strong>{briefing.dueTasks}</strong> tasks due today</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                )}
                {briefing.habitsToComplete > 0 && (
                    <Link href="/habits" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors group">
                        <Flame className="w-4 h-4 text-green-400 shrink-0" />
                        <span><strong>{briefing.habitsToComplete}</strong> habits to complete</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                )}
                {briefing.streaksAtRisk?.length > 0 && (
                    <Link href="/habits" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors group">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span><strong>{briefing.streaksAtRisk.length}</strong> streaks at risk</span>
                        <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                )}
                {briefing.conflicts?.length > 0 && (
                    <Link href="/calendar" className="flex items-center gap-2 text-xs text-amber-400/80 hover:text-amber-300 transition-colors group mt-2">
                        ⚠️ {briefing.conflicts.length} scheduling conflict{briefing.conflicts.length > 1 ? 's' : ''} detected
                        <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                )}
            </div>

            {/* Top 3 Priority Tasks */}
            {top3Tasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Today&apos;s Top 3</p>
                    </div>
                    <div className="space-y-1.5">
                        {top3Tasks.map((task, i) => (
                            <Link
                                key={task.id}
                                href={`/planner/${task.id}`}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-red-500/20 text-red-400' :
                                        i === 1 ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                    {i + 1}
                                </span>
                                <span className="text-sm text-slate-300 truncate flex-1">{task.title}</span>
                                {task.dueDate && (
                                    <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                                <ChevronRight className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Exams */}
            {upcomingExams.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5">Upcoming Exams</p>
                    {upcomingExams.slice(0, 3).map((exam, i) => (
                        <Link key={i} href="/exam-warroom" className="flex justify-between text-xs text-slate-400 py-0.5 hover:text-slate-300 transition-colors">
                            <span>{exam.title}</span>
                            <span className={exam.daysUntil <= 3 ? 'text-red-400 font-bold' : ''}>
                                {exam.daysUntil}d away
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
