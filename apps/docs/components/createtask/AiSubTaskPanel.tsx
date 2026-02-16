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
        <div className="bg-gradient-to-br from-white/8 to-white/4 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-2xl hover:border-white/20 transition-all duration-500 group">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="font-bold text-white text-lg">AI Subtask Generator</h3>
                </div>

                <button
                    onClick={() => {
                        const newState = !enabled;
                        setEnabled(newState);
                        if (newState) onGenerate();
                    }}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${enabled ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/30' : 'bg-white/10'
                        }`}
                    aria-label="Toggle AI subtask generator"
                >
                    <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${enabled ? 'left-8' : 'left-1'
                            }`}
                    ></div>
                </button>
            </div>

            <div className="space-y-2.5">
                {subtasks.map((subtask, index) => (
                    <label
                        key={subtask.id}
                        className={`flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl transition-all hover:bg-white/8 hover:border-white/15 animate-in slide-in-from-left-2 fade-in ${subtask.loading ? 'opacity-50' : 'cursor-pointer'
                            }`}
                        style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
                    >
                        <input
                            type="checkbox"
                            checked={subtask.completed}
                            disabled={subtask.loading}
                            onChange={() => onSubtaskToggle(subtask.id)}
                            className="w-5 h-5 mt-0.5 rounded-lg border-2 border-purple-500/50 bg-transparent checked:bg-purple-600 checked:border-purple-600 cursor-pointer disabled:cursor-not-allowed transition-all"
                        />
                        <span className={`flex-1 text-sm leading-relaxed ${subtask.loading ? 'text-slate-500 italic' : 'text-slate-200'}`}>
                            {subtask.text}
                        </span>
                        {subtask.loading && (
                            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        )}
                    </label>
                ))}
                {isLoading && (
                    <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl opacity-50">
                        <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                        <span className="text-sm text-slate-500 italic">Generating subtasks...</span>
                    </div>
                )}
            </div>
        </div>
    );
}