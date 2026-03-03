// components/createtask/TaskDetailsForm.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import type { Category } from '@repo/store';
import type { EffortOption, SubtaskDraft } from '@/hooks/useCreateTaskForm';
import { EFFORT_OPTIONS } from '@/hooks/useCreateTaskForm';

interface TaskDetailsFormProps {
    selectedSubjectId: string;
    setSelectedSubjectId: (v: string) => void;
    selectedPriority: string;
    setSelectedPriority: (v: string) => void;
    selectedEffort: EffortOption;
    setSelectedEffort: (v: EffortOption) => void;
    description: string;
    setDescription: (v: string) => void;
    categories: Category[] | undefined;
    showManualDetails: boolean;
    setShowManualDetails: (v: boolean) => void;
    aiSubtaskEnabled: boolean;
    setAiSubtaskEnabled: (v: boolean) => void;
    isRecurring: boolean;
    setIsRecurring: (v: boolean) => void;
    subtasks: SubtaskDraft[];
    setSubtasks: (v: SubtaskDraft[]) => void;
    dueDateValue: string;
    dueTimeValue: string;
    updateDueDateTime: (nextDate: string, nextTime: string, dateUpdated?: boolean) => void;
    handleGenerateSubtasks: () => Promise<void>;
}

export function TaskDetailsForm({
    selectedSubjectId, setSelectedSubjectId,
    selectedPriority, setSelectedPriority,
    selectedEffort, setSelectedEffort,
    description, setDescription,
    categories,
    showManualDetails, setShowManualDetails,
    aiSubtaskEnabled, setAiSubtaskEnabled,
    isRecurring, setIsRecurring,
    subtasks, setSubtasks,
    dueDateValue, dueTimeValue, updateDueDateTime,
    handleGenerateSubtasks,
}: TaskDetailsFormProps) {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Subject */}
                <div className="space-y-2">
                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Subject</Label>
                    <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                    >
                        <option value="">Select subject</option>
                        {categories?.map((c) => (
                            <option key={c.id} value={String(c.id)} className="text-black">{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Priority</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['Routine', 'Medium', 'Urgent'] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setSelectedPriority(p)}
                                className={`h-12 rounded-xl text-xs font-semibold border transition-all ${
                                    selectedPriority === p
                                        ? 'bg-indigo-500/30 border-indigo-400/50 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Effort */}
                <div className="space-y-2">
                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Effort</Label>
                    <div className="grid grid-cols-4 gap-2">
                        {EFFORT_OPTIONS.map((effort) => (
                            <button
                                key={effort}
                                type="button"
                                onClick={() => setSelectedEffort(effort)}
                                className={`h-12 rounded-xl text-xs font-semibold border transition-all ${
                                    selectedEffort === effort
                                        ? 'bg-indigo-500/30 border-indigo-400/50 text-white'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                }`}
                            >
                                {effort}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-4">
                <button
                    type="button"
                    onClick={() => setShowManualDetails(!showManualDetails)}
                    className="text-sm text-slate-300 hover:text-white transition-colors"
                >
                    {showManualDetails ? '▾' : '▸'} Manual Overrides &amp; Details
                </button>

                {showManualDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-1">
                            <Label htmlFor="description" className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
                                Detailed Description
                            </Label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add specific instructions, links, or notes..."
                                className="w-full min-h-[88px] px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Due Date</Label>
                                    <Input
                                        type="date"
                                        value={dueDateValue}
                                        onChange={(e) => updateDueDateTime(e.target.value, dueTimeValue, true)}
                                        className="h-12 bg-white/5 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Time</Label>
                                    <TimePickerInput
                                        value={dueTimeValue}
                                        onChange={(nextTime) => updateDueDateTime(dueDateValue, nextTime)}
                                        className="h-12 bg-white/5 border-white/10 text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsRecurring(!isRecurring)}
                                    className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between text-sm transition-all hover:bg-white/10"
                                >
                                    <span className="text-slate-200">Recurring Task</span>
                                    <span className={`inline-flex h-6 w-10 rounded-full p-1 transition-colors ${isRecurring ? 'bg-purple-500/70' : 'bg-white/20'}`}>
                                        <span className={`h-4 w-4 rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        const next = !aiSubtaskEnabled;
                                        setAiSubtaskEnabled(next);
                                        if (next) await handleGenerateSubtasks();
                                    }}
                                    className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between text-sm transition-all hover:bg-white/10"
                                >
                                    <span className="text-slate-200">AI Subtask Generator</span>
                                    <span className={`inline-flex h-6 w-10 rounded-full p-1 transition-colors ${aiSubtaskEnabled ? 'bg-indigo-500/70' : 'bg-white/20'}`}>
                                        <span className={`h-4 w-4 rounded-full bg-white transition-transform ${aiSubtaskEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {aiSubtaskEnabled && subtasks.length > 0 && (
                    <div className="space-y-2">
                        {subtasks.map((subtask) => (
                            <label key={subtask.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-sm">
                                <input
                                    type="checkbox"
                                    checked={subtask.completed}
                                    onChange={() =>
                                        setSubtasks(subtasks.map((t) =>
                                            t.id === subtask.id ? { ...t, completed: !t.completed } : t
                                        ))
                                    }
                                />
                                <span className={subtask.completed ? 'line-through text-slate-400' : 'text-slate-200'}>
                                    {subtask.text}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
