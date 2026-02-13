'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Task, useUpdateTaskMutation } from '@repo/store';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { buildRecoveryPlan, type RecoveryPlan } from '@/lib/recoveryPlan';

interface RecoveryModePanelProps {
    tasks: Task[];
}

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function RecoveryModePanel({ tasks }: RecoveryModePanelProps) {
    const { toast } = useToast();
    const [updateTask] = useUpdateTaskMutation();
    const [plan, setPlan] = useState<RecoveryPlan | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    const preview = useMemo(() => buildRecoveryPlan(tasks), [tasks]);
    const activePlan = plan ?? preview;

    const overdueCount = preview.backlogCount;
    const hasPlan = activePlan.items.length > 0;

    const handleGenerate = () => {
        const generatedPlan = buildRecoveryPlan(tasks);
        setPlan(generatedPlan);
        if (generatedPlan.items.length === 0) {
            toast('No overdue tasks. Recovery mode is on standby.', 'success');
            return;
        }
        toast(`Recovery plan generated for ${generatedPlan.items.length} tasks.`, 'success');
    };

    const handleApply = async () => {
        if (!hasPlan) return;

        setIsApplying(true);
        try {
            const outcomes = await Promise.allSettled(
                activePlan.items.map((item) =>
                    updateTask({
                        id: item.taskId,
                        dueDate: item.newDueDate,
                    }).unwrap()
                )
            );

            const success = outcomes.filter((result) => result.status === 'fulfilled').length;
            const failed = outcomes.length - success;

            if (success > 0) {
                toast(`Recovery plan applied to ${success} tasks.`, 'success');
            }
            if (failed > 0) {
                toast(`${failed} tasks could not be rescheduled.`, 'error');
            }

            if (failed === 0) {
                setPlan(null);
            }
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <section className="mb-6 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-5 backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                        <Wand2 className="h-3.5 w-3.5" />
                        AI Recovery Mode
                    </div>
                    <h3 className="text-xl font-bold text-white">Auto-rebalance overdue workload</h3>
                    <p className="max-w-2xl text-sm text-slate-300">
                        Detects backlog pressure, prioritizes high-impact tasks, and shifts due dates to a realistic pace.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleGenerate}
                        className="border-amber-400/30 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {plan ? 'Regenerate Plan' : 'Generate Plan'}
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={!hasPlan || isApplying}
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90"
                    >
                        {isApplying ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Applying...
                            </>
                        ) : (
                            <>
                                <CalendarClock className="mr-2 h-4 w-4" />
                                Apply Recovery Plan
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Backlog</p>
                    <p className="mt-1 text-2xl font-black text-white">{overdueCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Priority Load</p>
                    <p className="mt-1 text-2xl font-black text-white">{activePlan.totalPriorityLoad}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Recovery Window</p>
                    <p className="mt-1 text-2xl font-black text-white">
                        {activePlan.recoveryDays > 0 ? `${activePlan.recoveryDays}d` : '0d'}
                    </p>
                </div>
            </div>

            {!hasPlan ? (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                    No overdue tasks right now. Recovery mode stays ready for the moment pressure spikes.
                </div>
            ) : (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Proposed Moves</p>
                    <div className="space-y-2">
                        {activePlan.items.slice(0, 6).map((item) => (
                            <div key={item.taskId} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-2">
                                <div>
                                    <p className="text-sm font-semibold text-white">{item.title}</p>
                                    <p className="text-xs text-slate-400">{item.priority} priority</p>
                                </div>
                                <div className="text-right text-xs">
                                    <p className="text-slate-500 line-through">{formatDate(item.oldDueDate)}</p>
                                    <p className="font-semibold text-cyan-300">{formatDate(item.newDueDate)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {activePlan.items.length > 6 && (
                        <p className="mt-2 text-xs text-slate-400">
                            +{activePlan.items.length - 6} additional tasks will be rescheduled.
                        </p>
                    )}
                </div>
            )}

            {overdueCount > 0 && !plan && (
                <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    {overdueCount} overdue tasks detected. Generate a recovery plan to rebalance.
                </div>
            )}
        </section>
    );
}
