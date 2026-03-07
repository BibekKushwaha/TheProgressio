// components/createtask/TaskDetailsForm.tsx
'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { CreateTaskDatePicker } from '@/components/createtask/CreateTaskDatePicker';
import { SubjectCombobox } from '@/components/createtask/SubjectCombobox';
import { Pencil, X, Plus, Check } from 'lucide-react';
import type { Category } from '@repo/store';
import type { EffortOption, SubtaskDraft } from '@/hooks/useCreateTaskForm';
import { EFFORT_OPTIONS } from '@repo/schemas/task';

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
    validationErrors?: Record<string, string>;
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
    validationErrors = {},
}: TaskDetailsFormProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [editingSubtaskId, setEditingSubtaskId] = useState<string | number | null>(null);
    const [editingText, setEditingText] = useState('');
    const [newSubtaskText, setNewSubtaskText] = useState('');

    const commitEdit = () => {
        if (editingSubtaskId === null) return;
        setSubtasks(subtasks.map(t =>
            t.id === editingSubtaskId ? { ...t, text: editingText.trim() || t.text } : t
        ));
        setEditingSubtaskId(null);
        setEditingText('');
    };

    const startEdit = (subtask: SubtaskDraft) => {
        setEditingSubtaskId(subtask.id);
        setEditingText(subtask.text);
    };

    const addManualSubtask = () => {
        const text = newSubtaskText.trim();
        if (!text) return;
        setSubtasks([...subtasks, { id: Date.now(), text, completed: false }]);
        setNewSubtaskText('');
    };
    return (
        <>
            <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Subject */}
                    <div className="space-y-3">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Subject</Label>
                        <SubjectCombobox
                            categories={categories}
                            value={selectedSubjectId}
                            onChange={setSelectedSubjectId}
                        />
                    </div>

                    {/* Priority */}
                    <div className="space-y-3">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Priority</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { value: 'Routine', label: 'Low',    activeColor: 'bg-emerald-500/30 border-emerald-400/50 text-white' },
                                { value: 'Medium',  label: 'Medium', activeColor: 'bg-amber-500/30  border-amber-400/50  text-white' },
                                { value: 'Urgent',  label: 'High',   activeColor: 'bg-rose-500/30    border-rose-400/50    text-white' },
                            ] as const).map((p) => {
                                const isActive = selectedPriority === p.value;
                                return (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setSelectedPriority(p.value)}
                                        className={`h-12 rounded-xl text-xs font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 ${isActive
                                            ? p.activeColor
                                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Effort */}
                    <div className="space-y-3">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Effort</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {EFFORT_OPTIONS.map((effort) => (
                                <button
                                    key={effort}
                                    type="button"
                                    onClick={() => setSelectedEffort(effort)}
                                    className={`h-12 rounded-xl text-xs font-semibold border transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 ${selectedEffort === effort
                                        ? 'bg-purple-500/40 border-purple-400/60 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                                        }`}
                                >
                                    {effort}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10 pt-4 space-y-4">
                <button
                    type="button"
                    onClick={() => setShowManualDetails(!showManualDetails)}
                    className="text-sm text-slate-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded px-1"
                >
                    {showManualDetails ? '▾' : '▸'} Date, Time &amp; More
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
                                    <CreateTaskDatePicker
                                        value={dueDateValue}
                                        onChange={(nextDate) => updateDueDateTime(nextDate, dueTimeValue, true)}
                                    />
                                    {validationErrors.dueDate && (
                                        <p className="text-[11px] text-rose-400 px-1">{validationErrors.dueDate}</p>
                                    )}
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

                            <div className="grid grid-cols-1 gap-3 mt-4">
                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={isRecurring}
                                        aria-label="Recurring Task"
                                        onClick={() => setIsRecurring(!isRecurring)}
                                        className="w-full h-11 px-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between text-sm transition-all hover:bg-white/10"
                                    >
                                        <span className="text-slate-200">Recurring Task</span>
                                        <span className={`inline-flex h-6 w-10 rounded-full p-1 transition-colors ${isRecurring ? 'bg-purple-500/70' : 'bg-white/20'}`}>
                                            <span className={`h-4 w-4 rounded-full bg-white transition-transform ${isRecurring ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </span>
                                    </button>
                                    <p className="text-[10px] text-slate-500 px-1">Repeat this task daily, weekly, or specifically.</p>
                                </div>

                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={aiSubtaskEnabled}
                                        aria-label="AI Subtask Generator"
                                        disabled={isGenerating}
                                        onClick={async () => {
                                            const next = !aiSubtaskEnabled;
                                            setAiSubtaskEnabled(next);
                                            if (next) {
                                                setIsGenerating(true);
                                                try { await handleGenerateSubtasks(); }
                                                finally { setIsGenerating(false); }
                                            }
                                        }}
                                        className="w-full h-11 px-4 rounded-xl border border-indigo-500/20 bg-white/5 flex items-center justify-between text-sm transition-all hover:bg-white/10 hover:border-indigo-500/40 disabled:opacity-70 disabled:cursor-wait focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900"
                                    >
                                        <span className="text-slate-200 flex items-center gap-2">
                                            <span className={isGenerating ? 'animate-spin inline-block text-indigo-400' : 'text-indigo-400'}>✨</span>
                                            AI Subtask Generator
                                            {isGenerating && <span className="text-[10px] text-indigo-400/70 font-normal">Generating…</span>}
                                        </span>
                                        <span className={`inline-flex h-6 w-10 rounded-full p-1 transition-colors ${aiSubtaskEnabled ? 'bg-indigo-500/70' : 'bg-white/20'}`}>
                                            <span className={`h-4 w-4 rounded-full bg-white transition-transform ${aiSubtaskEnabled ? 'translate-x-4' : 'translate-x-0'} ${isGenerating ? 'animate-pulse' : ''}`} />
                                        </span>
                                    </button>
                                    <p className="text-[10px] text-slate-500 px-1">Automatically breakdown this task into actionable sub-steps.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {(aiSubtaskEnabled && subtasks.length > 0) || subtasks.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-[11px] tracking-[0.14em] uppercase text-slate-400 px-1">Subtasks</p>
                        {subtasks.map((subtask) => (
                            <div key={subtask.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-sm group">
                                <input
                                    type="checkbox"
                                    checked={subtask.completed}
                                    onChange={() =>
                                        setSubtasks(subtasks.map((t) =>
                                            t.id === subtask.id ? { ...t, completed: !t.completed } : t
                                        ))
                                    }
                                    className="accent-indigo-500 flex-shrink-0"
                                />
                                {editingSubtaskId === subtask.id ? (
                                    <input
                                        autoFocus
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onBlur={commitEdit}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                                            if (e.key === 'Escape') { setEditingSubtaskId(null); }
                                        }}
                                        className="flex-1 bg-transparent text-white focus:outline-none border-b border-indigo-500/50 pb-0.5"
                                    />
                                ) : (
                                    <span
                                        className={`flex-1 cursor-text ${subtask.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}
                                        onClick={() => startEdit(subtask)}
                                    >
                                        {subtask.text}
                                    </span>
                                )}
                                {editingSubtaskId === subtask.id ? (
                                    <button type="button" onClick={commitEdit} className="text-indigo-400 hover:text-indigo-300 flex-shrink-0">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => startEdit(subtask)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-200 flex-shrink-0 transition-opacity"
                                        aria-label="Edit subtask"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSubtasks(subtasks.filter((t) => t.id !== subtask.id))}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 flex-shrink-0 transition-opacity"
                                    aria-label="Remove subtask"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newSubtaskText}
                                onChange={(e) => setNewSubtaskText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); addManualSubtask(); }
                                }}
                                placeholder="Add a subtask…"
                                className="flex-1 h-9 px-3 bg-white/5 border border-dashed border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/40"
                            />
                            <button
                                type="button"
                                onClick={addManualSubtask}
                                disabled={!newSubtaskText.trim()}
                                className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-40 transition-colors"
                                aria-label="Add subtask"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    );
}
