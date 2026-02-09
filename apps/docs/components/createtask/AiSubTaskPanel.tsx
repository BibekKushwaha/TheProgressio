// components/create-task/AISubtaskPanel.tsx
'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';

interface Subtask {
    id: string | number;
    text: string;
    completed: boolean;
    loading?: boolean;
}

interface AISubtaskPanelProps {
    subtasks: Subtask[];
    onSubtaskToggle: (id: string | number) => void;
    isLoading?: boolean;
    onGenerate: () => void;
}

export function AISubtaskPanel({ subtasks, onSubtaskToggle, isLoading, onGenerate }: AISubtaskPanelProps) {
    const [enabled, setEnabled] = useState(true);

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white">AI Subtask Generator</h3>
                </div>

                <button
                    onClick={() => {
                        const newState = !enabled;
                        setEnabled(newState);
                        if (newState) onGenerate();
                    }}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-white/20'
                        }`}
                    aria-label="Toggle AI subtask generator"
                >
                    <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${enabled ? 'left-7' : 'left-1'
                            }`}
                    ></div>
                </button>
            </div>

            <div className="space-y-3">
                {subtasks.map((subtask) => (
                    <label
                        key={subtask.id}
                        className={`flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl transition-all ${subtask.loading ? 'opacity-50' : 'hover:bg-white/10 cursor-pointer'
                            }`}
                    >
                        <input
                            type="checkbox"
                            checked={subtask.completed}
                            disabled={subtask.loading}
                            onChange={() => onSubtaskToggle(subtask.id)}
                            className="w-5 h-5 mt-0.5 rounded border-2 border-purple-500 bg-transparent checked:bg-purple-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span className={`flex-1 text-sm ${subtask.loading ? 'text-slate-500 italic' : 'text-slate-200'}`}>
                            {subtask.text}
                        </span>
                        {subtask.loading && (
                            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        )}
                    </label>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl opacity-50">
                        <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        <span className="text-sm text-slate-500 italic">Generating subtasks...</span>
                    </div>
                )}
            </div>
        </div>
    );
}