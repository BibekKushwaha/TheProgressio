'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Task, useApplyRecoveryPlanMutation, usePreviewRecoveryPlanMutation } from '@repo/store';
import { Button } from '@/components/ui/button';
import { buildRecoveryPlan, type RecoveryPlan } from '@/lib/recoveryPlan';

interface RecoveryModePanelProps {
    tasks: Task[];
}

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

import { toast } from 'sonner';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

export function RecoveryModePanel({ tasks }: RecoveryModePanelProps) {
    const [previewRecoveryPlan, { isLoading: isPreviewing }] = usePreviewRecoveryPlanMutation();
    const [applyRecoveryPlan, { isLoading: isApplying }] = useApplyRecoveryPlanMutation();
    const [plan, setPlan] = useState<RecoveryPlan | null>(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [overrides, setOverrides] = useState<Record<string, string>>({});

    const preview = useMemo(() => buildRecoveryPlan(tasks, anchorDate), [tasks, anchorDate]);
    const activePlan = plan ?? preview;

    const overdueCount = preview.backlogCount;
    const hasPlan = activePlan.items.length > 0;

    const handleGenerate = async () => {
        let generatedPlan: RecoveryPlan | null = null;

        try {
            const response = await previewRecoveryPlan({
                anchorDate: anchorDate.toISOString()
            }).unwrap();
            generatedPlan = response?.plan || null;

            if (generatedPlan) {
                setPlan(generatedPlan);
                const itemIds = generatedPlan.items?.map(i => i.taskId) || [];
                setSelectedTaskIds(new Set(itemIds));

                if (itemIds.length === 0) {
                    toast.success('No overdue tasks. Recovery mode is on standby.');
                } else {
                    toast.success(`AI Recovery plan generated for ${itemIds.length} tasks.`);
                }
                setOverrides({});
                return;
            }
        } catch (error) {
            console.error('AI Recovery preview failed:', error);
        }

        // Fallback to local heuristic if AI fails or returns no plan
        const localPlan = buildRecoveryPlan(tasks, anchorDate);
        setPlan(localPlan);
        const localItemIds = localPlan.items?.map(i => i.taskId) || [];
        setSelectedTaskIds(new Set(localItemIds));
        setOverrides({});

        if (localItemIds.length === 0) {
            toast.success('No overdue tasks. Recovery mode is on standby.');
        } else {
            toast.info(`Local recovery plan generated for ${localItemIds.length} tasks.`);
        }
    };

    const handleApply = async () => {
        if (!hasPlan || selectedTaskIds.size === 0) {
            if (hasPlan) toast.error('Please select at least one task to recover.');
            return;
        }
        try {
            const response = await applyRecoveryPlan({
                taskIds: Array.from(selectedTaskIds),
                anchorDate: anchorDate.toISOString(),
                overrides: overrides
            }).unwrap();
            toast.success(`Recovery plan applied to ${response?.updatedCount || 0} tasks.`);
            setPlan(null);
            setSelectedTaskIds(new Set());
            setOverrides({});
        } catch (error) {
            console.error('Recovery apply failed:', error);
            toast.error('Recovery apply failed. Please retry.');
        }
    };

    const toggleTaskSelection = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedTaskIds.size === activePlan.items.length) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(activePlan.items.map(i => i.taskId)));
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

                <div className="flex flex-1 items-center justify-between gap-4 sm:ml-10">
                    <div className="flex-shrink-0">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[180px] md:w-[200px] justify-start text-left font-normal border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl",
                                        !anchorDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-amber-400" />
                                    {anchorDate ? format(anchorDate, "MMM d, yyyy") : <span>Start Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10" align="start">
                                <Calendar
                                    mode="single"
                                    selected={anchorDate}
                                    onSelect={(date) => date && setAnchorDate(date)}
                                    initialFocus
                                    className="bg-slate-900 text-white"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleGenerate}
                            disabled={isPreviewing}
                            className="border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 rounded-xl px-4 h-10"
                        >
                            {isPreviewing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    <span className="hidden sm:inline">Thinking...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    <span>{plan ? 'Regenerate' : 'Generate'}</span>
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleApply}
                            disabled={!hasPlan || isApplying || selectedTaskIds.size === 0}
                            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 disabled:opacity-50 rounded-xl px-6 h-10 shadow-lg shadow-amber-500/20"
                        >
                            {isApplying ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    <span>Applying...</span>
                                </>
                            ) : (
                                <>
                                    <CalendarClock className="mr-2 h-4 w-4" />
                                    <span>Apply ({selectedTaskIds.size})</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="group relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 via-red-900/5 to-transparent p-4 transition-all hover:border-red-500/30">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-red-400">Backlog</p>
                        <AlertTriangle className="h-4 w-4 text-red-500/50" />
                    </div>
                    <p className="mt-2 text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
                        {overdueCount}
                    </p>
                    <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-red-500/10 blur-2xl group-hover:bg-red-500/20 transition-all" />
                </div>

                <div className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-900/5 to-transparent p-4 transition-all hover:border-amber-500/30">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Priority Load</p>
                        <Sparkles className="h-4 w-4 text-amber-500/50" />
                    </div>
                    <p className="mt-2 text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
                        {activePlan.totalPriorityLoad}
                    </p>
                    <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all" />
                </div>

                <div className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-blue-900/5 to-transparent p-4 transition-all hover:border-blue-500/30">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Recovery Window</p>
                        <CalendarClock className="h-4 w-4 text-blue-500/50" />
                    </div>
                    <p className="mt-2 text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
                        {activePlan.recoveryDays > 0 ? `${activePlan.recoveryDays}d` : '0d'}
                    </p>
                    <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all" />
                </div>
            </div>

            {!hasPlan ? (
                <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                    No overdue tasks right now. Recovery mode stays ready for the moment pressure spikes.
                </div>
            ) : (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Proposed Moves</p>
                        <button
                            onClick={toggleAll}
                            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-tighter"
                        >
                            {selectedTaskIds.size === activePlan.items.length ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {activePlan.items.map((item) => {
                            const currentDueDate = overrides[item.taskId] || item.newDueDate;

                            return (
                                <div
                                    key={item.taskId}
                                    className={`flex items-center gap-3 rounded-lg border p-2 transition-all ${selectedTaskIds.has(item.taskId)
                                        ? 'border-cyan-500/50 bg-cyan-500/10'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div
                                        onClick={() => toggleTaskSelection(item.taskId)}
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer ${selectedTaskIds.has(item.taskId)
                                            ? 'bg-cyan-500 border-cyan-500'
                                            : 'border-slate-500'
                                            }`}
                                    >
                                        {selectedTaskIds.has(item.taskId) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                    <div className="flex-1 min-w-0" onClick={() => toggleTaskSelection(item.taskId)}>
                                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                                        <p className="text-[10px] text-slate-400">{item.priority} priority</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-0.5">
                                        <p className="text-slate-500 line-through text-[10px]">{formatDate(item.oldDueDate)}</p>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={cn(
                                                        "font-bold text-xs transition-colors hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10",
                                                        overrides[item.taskId] ? "text-purple-400" : "text-cyan-300"
                                                    )}
                                                >
                                                    {formatDate(currentDueDate)}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 shadow-2xl z-50" align="end">
                                                <Calendar
                                                    mode="single"
                                                    selected={(() => {
                                                        const d = new Date(currentDueDate);
                                                        return isNaN(d.getTime()) ? new Date() : d;
                                                    })()}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            setOverrides(prev => ({
                                                                ...prev,
                                                                [item.taskId]: date.toISOString()
                                                            }));
                                                            // Auto-select if a date is picked
                                                            if (!selectedTaskIds.has(item.taskId)) {
                                                                toggleTaskSelection(item.taskId);
                                                            }
                                                        }
                                                    }}
                                                    initialFocus
                                                    className="bg-slate-900 text-white"
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
