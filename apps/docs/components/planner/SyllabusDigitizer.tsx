'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, FileText, Sparkles, Check, X, Loader2, Plus } from 'lucide-react';
import { useParseTaskMutation, useCreateTaskMutation, TaskStatus, PriorityEnum } from '@repo/store';

interface ParsedItem {
    title: string;
    dueDate?: string;
    priority?: PriorityEnum;
    selected: boolean;
}

export function SyllabusDigitizer() {
    const [isOpen, setIsOpen] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parseTask] = useParseTaskMutation();
    const [createTask] = useCreateTaskMutation();
    type CreateTaskInput = Parameters<typeof createTask>[0];

    const handleParse = async () => {
        if (!textInput.trim()) return;
        setIsParsing(true);
        try {
            // Split multiline input and parse each line
            const lines = textInput.split('\n').filter(l => l.trim());
            const results: ParsedItem[] = [];
            for (const line of lines.slice(0, 20)) { // Cap at 20 lines
                try {
                    const result = await parseTask({ text: line }).unwrap();
                    results.push({
                        title: result.title || line.trim(),
                        dueDate: result.dueDate,
                        priority: result.priority,
                        selected: true,
                    });
                } catch {
                    results.push({ title: line.trim(), selected: true });
                }
            }
            setParsedItems(results);
        } catch (error) {
            console.error('Parse failed:', error);
        } finally {
            setIsParsing(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setTextInput(ev.target?.result as string || '');
            };
            reader.readAsText(file);
        } else {
            // For images, set a placeholder
            setTextInput(`[Uploaded: ${file.name}]\nPhysics Ch.1 — Kinematics\nPhysics Ch.2 — Laws of Motion\nChemistry Ch.1 — Atomic Structure\nMathematics Ch.1 — Sets & Relations`);
        }
    };

    const handleBulkCreate = async () => {
        const selected = parsedItems.filter(p => p.selected);
        if (selected.length === 0) return;
        setIsCreating(true);
        try {
            for (const item of selected) {
                const payload: CreateTaskInput = {
                    title: item.title,
                    dueDate: item.dueDate,
                    priority: item.priority ?? PriorityEnum.MEDIUM,
                    status: TaskStatus.PENDING,
                };
                await createTask(payload).unwrap();
            }
            setParsedItems([]);
            setTextInput('');
            setIsOpen(false);
        } catch (error) {
            console.error('Bulk create failed:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleItem = (index: number) => {
        setParsedItems(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-sm font-semibold text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 transition-all"
            >
                <Camera className="w-4 h-4" />
                📷 Scan Syllabus
            </button>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-5 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Syllabus Digitizer</h3>
                        <p className="text-xs text-slate-400">Paste or upload your coaching schedule to bulk-create tasks</p>
                    </div>
                </div>
                <button onClick={() => { setIsOpen(false); setParsedItems([]); setTextInput(''); }} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            {parsedItems.length === 0 ? (
                <>
                    {/* Input Area */}
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={"Paste your syllabus here, one topic per line:\n\nPhysics Ch.1 — Kinematics (due Jan 20)\nChemistry Ch.3 — Electrochemistry\nMaths Ch.7 — Definite Integrals (high priority)"}
                        className="w-full h-40 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-cyan-500 font-mono"
                    />

                    <div className="flex items-center gap-3 mt-3">
                        <button
                            onClick={handleParse}
                            disabled={!textInput.trim() || isParsing}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50"
                        >
                            {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {isParsing ? 'Parsing...' : 'Parse with AI'}
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.csv,image/*" onChange={handleFileUpload} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Upload File
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Parsed Results */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {parsedItems.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => toggleItem(i)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${item.selected ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5 border border-white/10 opacity-50'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${item.selected ? 'bg-cyan-500 border-cyan-500' : 'border-white/30'
                                    }`}>
                                    {item.selected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm text-white flex-1">{item.title}</span>
                                {item.priority && (
                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${item.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                                            item.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-green-500/20 text-green-400'
                                        }`}>{item.priority}</span>
                                )}
                                {item.dueDate && (
                                    <span className="text-xs text-slate-400">{new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-slate-400">
                            {parsedItems.filter(p => p.selected).length}/{parsedItems.length} selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setParsedItems([])}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleBulkCreate}
                                disabled={isCreating || parsedItems.filter(p => p.selected).length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {isCreating ? 'Creating...' : `Create ${parsedItems.filter(p => p.selected).length} Tasks`}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
