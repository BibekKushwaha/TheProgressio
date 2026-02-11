'use client';

import { useState, useRef } from 'react';
import { Sparkles, Loader2, ArrowRight, X } from 'lucide-react';
import { useParseTaskMutation, useCreateTaskMutation, TaskStatus } from '@repo/store';

export function NLPCommandBar() {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [parsedResult, setParsedResult] = useState<any>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [parseTask, { isLoading: isParsing }] = useParseTaskMutation();
    const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();

    const handleParse = async () => {
        if (!input.trim()) return;
        try {
            const result = await parseTask({ text: input }).unwrap();
            setParsedResult(result);
        } catch {
            console.error('Failed to parse task');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleParse();
        if (e.key === 'Escape') { setIsOpen(false); setParsedResult(null); setInput(''); }
    };

    const handleCreate = async () => {
        if (!parsedResult) return;
        try {
            await createTask({
                title: parsedResult.title,
                description: parsedResult.description || '',
                dueDate: parsedResult.dueDate,
                priority: parsedResult.priority || 'MEDIUM',
                status: TaskStatus.PENDING,
            }).unwrap();
            setParsedResult(null);
            setInput('');
            setIsOpen(false);
        } catch {
            console.error('Failed to create task');
        }
    };

    const handleDismiss = () => {
        setParsedResult(null);
        setInput('');
        setIsOpen(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="w-full flex items-center gap-3 px-5 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-xl transition-all duration-300 group"
            >
                <Sparkles className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" />
                <span className="text-slate-500 group-hover:text-slate-400 text-sm">
                    Type naturally... &quot;Study physics chapter 3 due Friday high priority&quot;
                </span>
            </button>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-indigo-500/30 rounded-xl p-4 shadow-lg shadow-indigo-500/5 space-y-3">
            <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Type naturally... "Study physics chapter 3 due Friday high priority"'
                    className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
                    autoFocus
                />
               
                {isParsing ? (
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                ) : (
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleParse}
                            disabled={!input.trim()}
                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-30 rounded-lg text-xs font-semibold text-white transition-colors"
                        >
                            Parse <ArrowRight className="w-3 h-3 inline ml-1" />
                        </button>
                        <button onClick={handleDismiss} className="p-1 text-slate-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
            
            {/* Parsed Result Preview */}
            {parsedResult && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">AI Parsed Result</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-slate-500 text-xs">Title:</span>
                            <p className="text-white font-medium">{parsedResult.title}</p>
                        </div>
                        {parsedResult.dueDate && (
                            <div>
                                <span className="text-slate-500 text-xs">Due:</span>
                                <p className="text-white">{new Date(parsedResult.dueDate).toLocaleDateString()}</p>
                            </div>
                        )}
                        {parsedResult.priority && (
                            <div>
                                <span className="text-slate-500 text-xs">Priority:</span>
                                <p className={`font-semibold ${parsedResult.priority === 'URGENT' ? 'text-red-400' :
                                    parsedResult.priority === 'HIGH' ? 'text-orange-400' :
                                        parsedResult.priority === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
                                    }`}>{parsedResult.priority}</p>
                            </div>
                        )}
                        {parsedResult.subject && (
                            <div>
                                <span className="text-slate-500 text-xs">Subject:</span>
                                <p className="text-white">{parsedResult.subject}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
                        >
                            {isCreating ? 'Creating...' : '✓ Create Task'}
                        </button>
                        <button
                            onClick={() => setParsedResult(null)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-slate-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
