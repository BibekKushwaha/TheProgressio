'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, Flame, Sparkles, CheckSquare } from 'lucide-react';
import { useGetCategoriesQuery, useGetHabitsQuery, useGetTasksQuery } from '@repo/store';
import { Button } from '@/components/ui/button';

type ChecklistItem = {
    key: string;
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    complete: boolean;
};

export function ActivationChecklist() {
    const { data: categories } = useGetCategoriesQuery();
    const { data: tasks } = useGetTasksQuery({ page: 1, limit: 10 });
    const { data: habitsData } = useGetHabitsQuery();

    const items = useMemo<ChecklistItem[]>(() => [
        {
            key: 'subject',
            title: 'Add your first subject',
            description: 'Organize tasks, exams, and analytics around what you study.',
            href: '/subjects',
            icon: BookOpen,
            complete: (categories?.length ?? 0) > 0,
        },
        {
            key: 'task',
            title: 'Plan your first task',
            description: 'Capture one study task and let AI break it into steps.',
            href: '/createtask',
            icon: CheckSquare,
            complete: (tasks?.length ?? 0) > 0,
        },
        {
            key: 'habit',
            title: 'Start one study habit',
            description: 'Build streaks for revision, practice, or daily consistency.',
            href: '/habits',
            icon: Flame,
            complete: (habitsData?.habits?.length ?? 0) > 0,
        },
    ], [categories, habitsData?.habits?.length, tasks?.length]);

    const completed = items.filter((item) => item.complete).length;
    const nextStep = items.find((item) => !item.complete);

    if (completed === items.length) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-6">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-300/80">
                        <Sparkles className="h-3.5 w-3.5" />
                        First-run setup
                    </div>
                    <h2 className="text-xl font-bold text-white md:text-2xl">Set up your study system in under 2 minutes</h2>
                    <p className="mt-2 text-sm text-slate-300">
                        Finish these 3 quick steps to unlock a more personalized dashboard, smarter AI suggestions, and meaningful analytics.
                    </p>
                </div>

                {nextStep ? (
                    <Button asChild className="btn-primary w-full lg:w-auto">
                        <Link href={nextStep.href}>
                            {nextStep.title}
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </Button>
                ) : null}
            </div>

            <div className="relative z-10 mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`rounded-xl border p-4 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${item.complete
                                ? 'border-emerald-500/20 bg-emerald-500/10'
                                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                }`}
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <div className={`rounded-lg border p-2 ${item.complete ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                {item.complete && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                            </div>
                            <div className="text-sm font-semibold text-white">{item.title}</div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.description}</p>
                        </Link>
                    );
                })}
            </div>

            <div className="relative z-10 mt-4 text-xs text-slate-400">
                {completed}/3 complete • your next best step is <span className="font-semibold text-white">{nextStep?.title.toLowerCase()}</span>
            </div>
        </div>
    );
}