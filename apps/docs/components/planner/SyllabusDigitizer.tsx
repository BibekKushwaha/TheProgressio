'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, Sparkles, Check, Loader2 } from 'lucide-react';
import { useParseTaskMutation, useCreateTaskMutation, useScanSyllabusMutation, TaskStatus, PriorityEnum } from '@repo/store';

interface ParsedItem {
    title: string;
    dueDate?: string;
    priority?: PriorityEnum;
    selected: boolean;
}

import { toast } from 'sonner';

export function SyllabusDigitizer() {
    const [textInput, setTextInput] = useState('');
    const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [scanNotice, setScanNotice] = useState('');
    const [bulkIsRecurring, setBulkIsRecurring] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parseTask] = useParseTaskMutation();
    const [scanSyllabus] = useScanSyllabusMutation();
    const [createTask] = useCreateTaskMutation();
    type CreateTaskInput = Parameters<typeof createTask>[0];

    const handleParse = async () => {
        if (!textInput.trim()) return;
        setIsParsing(true);
        setScanNotice('');
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
            if (results.length > 0) {
                toast.success(`Extracted ${results.length} tasks from text`);
            }
        } catch (error) {
            console.error('Parse failed:', error);
            toast.error('Failed to parse text');
        } finally {
            setIsParsing(false);
        }
    };

    const processFile = (file: File) => {
        setScanNotice('');

        if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setTextInput(ev.target?.result as string || '');
                setScanNotice(`Loaded ${file.name}. Click "Parse with AI" to structure tasks.`);
                toast.info(`Loaded ${file.name}`);
            };
            reader.readAsText(file);
            return;
        }

        if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const imageBase64 = typeof ev.target?.result === 'string' ? ev.target.result : '';
                if (!imageBase64) return;

                setIsParsing(true);
                setScanNotice(file.type === 'application/pdf'
                    ? 'Extracting text from PDF first. This is usually faster and avoids vision limits.'
                    : 'Image scan is queued to avoid rate limits. It may take up to ~15s on free tier.');

                toast.loading(`Scanning ${file.name}...`, { id: 'scan-syllabus' });

                try {
                    const response = await scanSyllabus({
                        imageBase64,
                        mimeType: file.type || 'image/jpeg',
                    }).unwrap();

                    if (response.items.length > 0) {
                        setParsedItems(response.items.map((item) => ({
                            title: item.title,
                            dueDate: item.dueDate,
                            priority: item.priority,
                            selected: true,
                        })));
                        setTextInput('');
                        setScanNotice(`Extracted ${response.items.length} item(s) from ${file.name}.`);
                        toast.success(`Found ${response.items.length} milestones!`, { id: 'scan-syllabus' });
                    } else {
                        setTextInput(`[No structured items found in ${file.name}]\nIf this was an image, retry after a short wait (vision queue/rate limits may delay results).\nOr paste syllabus text manually for best reliability.`);
                        setScanNotice('No milestones found. For best results, upload a text-based PDF or paste text.');
                        toast.error('No tasks found in file', { id: 'scan-syllabus' });
                    }
                } catch (error) {
                    console.error('Syllabus image scan failed:', error);
                    setTextInput(`[Scan failed for ${file.name}]\nTry again shortly, or paste the syllabus text manually.`);
                    setScanNotice('Scan failed due to temporary AI limits or network issues.');
                    toast.error('AI scan failed. Please try pasting text.', { id: 'scan-syllabus' });
                } finally {
                    setIsParsing(false);
                }
            };
            reader.readAsDataURL(file);
            return;
        }

        setTextInput(`[Unsupported file format: ${file.name}]\nUse image, pdf, txt, or csv files.`);
        toast.error('Unsupported file format');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleBulkCreate = async () => {
        const selected = parsedItems.filter(p => p.selected);
        if (selected.length === 0) return;
        setIsCreating(true);
        toast.loading(`Creating ${selected.length} tasks...`, { id: 'bulk-create' });
        try {
            for (const item of selected) {
                const payload: CreateTaskInput = {
                    title: item.title,
                    dueDate: item.dueDate,
                    priority: item.priority ?? PriorityEnum.MEDIUM,
                    status: TaskStatus.PENDING,
                    isRecurring: bulkIsRecurring,
                };
                await createTask(payload).unwrap();
            }
            toast.success(`Successfully created ${selected.length} tasks`, { id: 'bulk-create' });
            setParsedItems([]);
            setTextInput('');
        } catch (error) {
            console.error('Bulk create failed:', error);
            toast.error('Failed to create some tasks', { id: 'bulk-create' });
        } finally {
            setIsCreating(false);
        }
    };

    const toggleItem = (index: number) => {
        setParsedItems(prev => prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Panel: Input */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 flex flex-col h-full min-h-[500px]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Upload className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Input Source</h2>
                        <p className="text-sm text-slate-400">Upload document or paste text</p>
                    </div>
                </div>

                <div
                    className={`flex-1 relative rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragging
                        ? 'border-cyan-500 bg-cyan-500/10 scale-[1.02]'
                        : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={"Paste your syllabus here...\n\nExample:\nPhysics Ch.1 — Kinematics (due Jan 20)\nChemistry Ch.3 — Electrochemistry (High Priority)"}
                        className="w-full h-full min-h-[300px] bg-transparent p-6 text-sm text-white placeholder:text-slate-500 font-mono resize-none focus:outline-none"
                    />

                    {!textInput && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500">
                            <Upload className="w-8 h-8 mb-3 opacity-50" />
                            <p className="text-sm">Drag & drop file or paste text</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={handleParse}
                        disabled={!textInput.trim() || isParsing}
                        className="flex-1 h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {isParsing ? 'Analyzing...' : 'Parse Content'}
                    </button>

                    <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.csv,.pdf,image/*" onChange={handleFileUpload} />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-12 px-6 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                        title="Upload File"
                    >
                        <FileText className="w-5 h-5" />
                    </button>
                </div>

                {scanNotice && (
                    <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200">
                        {scanNotice}
                    </div>
                )}
            </div>

            {/* Right Panel: Output */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 flex flex-col h-full min-h-[500px]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Check className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Review Tasks</h2>
                            <p className="text-sm text-slate-400">
                                {parsedItems.length > 0
                                    ? `${parsedItems.filter(p => p.selected).length} selected to create`
                                    : 'Parsed items will appear here'}
                            </p>
                        </div>
                    </div>
                    {parsedItems.length > 0 && (
                        <button
                            onClick={() => setParsedItems([])}
                            className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-white/5 rounded-lg border border-white/5 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 overflow-hidden relative">
                    {parsedItems.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <Sparkles className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="text-sm max-w-[200px]">
                                Use the input panel to parse your syllabus into actionable tasks.
                            </p>
                        </div>
                    ) : (
                        <div className="absolute inset-0 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {parsedItems.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => toggleItem(i)}
                                    className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${item.selected
                                        ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border-cyan-500/30'
                                        : 'bg-white/5 border-white/5 hover:bg-white/[0.07] opacity-60'
                                        }`}
                                >
                                    <div className={`mt-1 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${item.selected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 group-hover:border-slate-500'
                                        }`}>
                                        {item.selected && <Check className="h-3 w-3 text-white" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium mb-1 transition-colors ${item.selected ? 'text-white' : 'text-slate-400'
                                            }`}>
                                            {item.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.priority && (
                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.priority === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                                                    item.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300' :
                                                        'bg-green-500/20 text-green-300'
                                                    }`}>
                                                    {item.priority}
                                                </span>
                                            )}
                                            {item.dueDate && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                                                    Due {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors">
                        <input
                            type="checkbox"
                            checked={bulkIsRecurring}
                            onChange={(e) => setBulkIsRecurring(e.target.checked)}
                            className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
                        />
                        <span>Mark as Recurring</span>
                    </label>

                    <button
                        onClick={handleBulkCreate}
                        disabled={isCreating || parsedItems.filter(p => p.selected).length === 0}
                        className="px-6 py-2.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-cyan-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-white/5"
                    >
                        {isCreating ? 'Creating...' : 'Create Tasks'}
                    </button>
                </div>
            </div>
        </div>
    );
}
