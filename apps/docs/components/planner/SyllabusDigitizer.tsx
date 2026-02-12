'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, FileText, Sparkles, Check, X, Loader2, Plus } from 'lucide-react';
import { useParseTaskMutation, useCreateTaskMutation, TaskStatus, PriorityEnum } from '@repo/store';

interface ParsedItem {
    title: string;
    description?: string;
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
    const [isReadingFile, setIsReadingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parseTask] = useParseTaskMutation();
    const [createTask] = useCreateTaskMutation();
    type CreateTaskInput = Parameters<typeof createTask>[0];
<<<<<<< HEAD

    const extractTitleAndDescription = (text: string): { title: string; description?: string } => {
        const cleaned = text.trim().replace(/\s+/g, ' ');
        
        // Split by first sentence ending with . ! or ?
        const sentenceMatch = cleaned.match(/^([^.!?]+[.!?])\s*(.*)$/);
        
        if (sentenceMatch && sentenceMatch.length > 2 && sentenceMatch[1] && sentenceMatch[2]) {
            // Has title and description
            const title = sentenceMatch[1].trim();
            const description = sentenceMatch[2].trim();
            return {
                title: title.length > 100 ? title.substring(0, 100).trim() + '...' : title,
                description: description.length > 0 ? description : undefined
            };
        }
        
        // Single sentence or no punctuation
        return {
            title: cleaned.length > 100 ? cleaned.substring(0, 100).trim() + '...' : cleaned
        };
    };

    const splitIntoChunks = (text: string): string[] => {
        // Split by double newlines (paragraphs) first
        let chunks = text.split(/\n\n+/).filter(l => l.trim().length > 0);
        
        // If too few chunks, try single newlines
        if (chunks.length < 3) {
            chunks = text.split('\n').filter(l => l.trim().length > 0);
        }
        
        // If still too few, try sentence splitting
        if (chunks.length < 3) {
            chunks = text
                .split(/(?<=[.!?])\s+/)
                .filter(s => s.trim().length > 0);
        }
        
        // Filter by length and clean
        return chunks
            .map(chunk => chunk.trim().replace(/\s+/g, ' '))
            .filter(chunk => chunk.length >= 5)
            .slice(0, 20); // Cap at 20 items
    };
=======
>>>>>>> origin/main

    const handleParse = async () => {
        if (!textInput.trim()) return;
        setIsParsing(true);
        try {
            // Split text into smaller, more manageable chunks
            const chunks = splitIntoChunks(textInput);
            const results: ParsedItem[] = [];
            
            for (const chunk of chunks) {
                try {
                    const result = await parseTask({ text: chunk }).unwrap();
                    const { title, description } = extractTitleAndDescription(
                        result.title || chunk.trim()
                    );
                    results.push({
                        title,
                        description: description || result.description,
                        dueDate: result.dueDate,
                        priority: result.priority,
                        selected: true,
                    });
                } catch {
                    const { title, description } = extractTitleAndDescription(chunk.trim());
                    results.push({ 
                        title, 
                        description,
                        selected: true 
                    });
                }
            }
            setParsedItems(results);
        } catch (error) {
            console.error('Parse failed:', error);
        } finally {
            setIsParsing(false);
        }
    };

    const extractPdfText = async (file: File) => {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            const pageText = (content.items as Array<{ str?: string }>).map((item) => item.str ?? '').join(' ');
            text += `${pageText}\n`;
        }
        return text;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsReadingFile(true);
        try {
            if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setTextInput((ev.target?.result as string) || '');
                };
                reader.readAsText(file);
                return;
            }

            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                const extractedText = await extractPdfText(file);
                setTextInput(extractedText.trim());
                return;
            }

            setTextInput(`[Uploaded: ${file.name}]`);
        } catch (error) {
            console.error('File upload failed:', error);
            setTextInput('');
        } finally {
            setIsReadingFile(false);
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
<<<<<<< HEAD
                    description: item.description,
=======
>>>>>>> origin/main
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
                            disabled={!textInput.trim() || isParsing || isReadingFile}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50"
                        >
                            {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {isParsing ? 'Parsing...' : 'Parse with AI'}
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.csv,.pdf,application/pdf,image/*" onChange={handleFileUpload} />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isReadingFile}
                            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-60"
                        >
                            {isReadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {isReadingFile ? 'Reading...' : 'Upload File'}
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
                                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left ${item.selected ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5 border border-white/10 opacity-50'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${item.selected ? 'bg-cyan-500 border-cyan-500' : 'border-white/30'
                                    }`}>
                                    {item.selected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                                    {item.description && (
                                        <div className="text-xs text-slate-400 line-clamp-2 mt-0.5">{item.description}</div>
                                    )}
                                </div>
                                {item.priority && (
                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0 ${item.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
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
