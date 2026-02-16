'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Task, useApplyRecoveryPlanMutation, usePreviewRecoveryPlanMutation } from '@repo/store';
import { buildRecoveryPlan, type RecoveryPlan } from '@/lib/recoveryPlan';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';

interface RecoveryModePanelProps {
    tasks: Task[];
}

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
        <section className="space-y-6">
            {/* Header Card */}
            <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 backdrop-blur-sm">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
                            <Wand2 className="h-4 w-4" />
                            AI Recovery Mode
                        </div>
                        <h3 className="text-2xl font-bold text-white">Auto-rebalance overdue workload</h3>
                        <p className="max-w-2xl text-sm text-slate-300">
                            Detects backlog pressure, prioritizes high-impact tasks, and shifts due dates to a realistic pace.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            {/* Date Picker */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all",
                                            "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
                                            "focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                                        )}
                                    >
                                        <CalendarIcon className="h-4 w-4 text-amber-400" />
                                        {format(anchorDate, "MMM d, yyyy")}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 shadow-2xl" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={anchorDate}
                                        onSelect={(date) => date && setAnchorDate(date)}
                                        initialFocus
                                        className="bg-slate-900 text-white"
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Action Buttons */}
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isPreviewing}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all",
                                        "border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20",
                                        "disabled:opacity-50 disabled:cursor-not-allowed",
                                        "focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                                    )}
                                >
                                    {isPreviewing ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            <span className="hidden sm:inline">Thinking...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            <span>{plan ? 'Regenerate' : 'Generate Plan'}</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleApply}
                                    disabled={!hasPlan || isApplying || selectedTaskIds.size === 0}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all",
                                        "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20",
                                        "hover:shadow-lg hover:shadow-amber-500/30 hover:scale-105",
                                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100",
                                        "focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                                    )}
                                >
                                    {isApplying ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            <span>Applying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CalendarClock className="h-4 w-4" />
                                            <span>Apply ({selectedTaskIds.size})</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
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

            {/* Task List or Empty State */}
            {!hasPlan ? (
                <div className="rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 text-sm text-emerald-200">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 flex-shrink-0" />
                        <span>No overdue tasks right now. Recovery mode stays ready for the moment pressure spikes.</span>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-sm overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-white">Proposed Moves</p>
                            <button
                                onClick={toggleAll}
                                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wide"
                            >
                                {selectedTaskIds.size === activePlan.items.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-1 max-h-96 overflow-y-auto divide-y divide-white/5 p-3">
                        {activePlan.items.map((item) => {
                            const currentDueDate = overrides[item.taskId] || item.newDueDate;
                            const isSelected = selectedTaskIds.has(item.taskId);

                            return (
                                <div
                                    key={item.taskId}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
                                        isSelected
                                            ? 'bg-cyan-500/15 border border-cyan-500/40'
                                            : 'border border-transparent hover:bg-white/5'
                                    )}
                                    onClick={() => toggleTaskSelection(item.taskId)}
                                >
                                    {/* Checkbox */}
                                    <div
                                        className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all",
                                            isSelected
                                                ? 'bg-cyan-500 border-cyan-500'
                                                : 'border-slate-400 hover:border-slate-300'
                                        )}
                                    >
                                        {isSelected && (
                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>

                                    {/* Task Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{item.priority} priority</p>
                                    </div>

                                    {/* Dates */}
                                    <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                        <p className="text-slate-500 line-through text-xs">{formatDate(item.oldDueDate)}</p>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={cn(
                                                        "font-semibold text-xs px-2 py-1 rounded transition-colors",
                                                        overrides[item.taskId]
                                                            ? "text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
                                                            : "text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20"
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
                                                            if (!isSelected) {
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

            {/* Warning Alert */}
            {overdueCount > 0 && !plan && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2 text-xs text-amber-300">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{overdueCount} overdue tasks detected. Generate a recovery plan to rebalance.</span>
                </div>
            )}
        </section>
    );
}
