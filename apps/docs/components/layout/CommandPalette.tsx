"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
    Search,
    CalendarDays,
    CheckSquare,
    BarChart2,
    GraduationCap,
    Swords,
    Users,
    Plus,
    FileText,
    Zap,
    Flame,
} from "lucide-react";
import { useCreateNoteMutation } from '@repo/store';
import { toast } from 'sonner';
import "./command-palette.css";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();
    const [createNote] = useCreateNoteMutation();

    // Toggle the menu when ⌘K is pressed
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = useCallback((command: () => void) => {
        setOpen(false);
        setSearch('');
        command();
    }, []);

    /** Inline quick-add handlers based on prefixed search text */
    const handleInlineCreate = useCallback(async () => {
        const lower = search.toLowerCase().trim();

        // note: <content>
        if (lower.startsWith('note:') || lower.startsWith('note ')) {
            const content = search.replace(/^note[: ]*/i, '').trim();
            if (!content) { toast.error('Note content cannot be empty'); return; }
            try {
                await createNote({ content }).unwrap();
                toast.success('Note saved!');
                setOpen(false); setSearch('');
            } catch { toast.error('Failed to save note'); }
            return;
        }

        // task: <title>  → navigate to create task with pre-filled title
        if (lower.startsWith('task:') || lower.startsWith('task ')) {
            const title = search.replace(/^task[: ]*/i, '').trim();
            runCommand(() => router.push(`/createtask${title ? `?title=${encodeURIComponent(title)}` : ''}`));
            return;
        }

        // focus: <duration> <topic> → navigate to focus session
        if (lower.startsWith('focus:') || lower.startsWith('focus ')) {
            const rest = search.replace(/^focus[: ]*/i, '').trim();
            const durationMatch = rest.match(/^(\d+)\s*m?\s*/i);
            const duration = durationMatch ? parseInt(durationMatch[1] ?? '25') : 25;
            const topic = durationMatch ? rest.replace(durationMatch[0], '').trim() : rest;
            runCommand(() => router.push(`/focus-session?task=${encodeURIComponent(topic || 'Focus Session')}&duration=${duration}`));
            return;
        }
    }, [search, createNote, runCommand, router]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={() => setOpen(false)}
            />

            <Command
                className="relative z-50 w-full max-w-2xl overflow-hidden rounded-xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-indigo-500/10 text-slate-100 ring-1 ring-white/5"
                loop
            >
                <div className="flex items-center border-b border-white/10 px-4">
                    <Search className="w-5 h-5 text-slate-400 shrink-0" />
                    <Command.Input
                        autoFocus
                        value={search}
                        onValueChange={setSearch}
                        className="flex h-14 w-full rounded-md bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Type a command, or 'task:', 'note:', 'focus:'..."
                    />
                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex text-slate-400">
                        ESC
                    </kbd>
                </div>

                <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 custom-scrollbar">
                    <Command.Empty className="py-6 text-center text-sm text-slate-400">
                        No results found.
                    </Command.Empty>

                    {/* Prefix hint chips — visible only when search is empty */}
                    {!search && (
                        <div className="px-2 pt-2 pb-3 border-b border-white/5 mb-1">
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Quick Create</p>
                            <div className="flex gap-2 flex-wrap">
                                {[
                                    { label: 'task: …', value: 'task: ', color: 'text-purple-400 border-purple-500/20 hover:border-purple-500/40' },
                                    { label: 'note: …', value: 'note: ', color: 'text-indigo-400 border-indigo-500/20 hover:border-indigo-500/40' },
                                    { label: 'focus: …', value: 'focus: ', color: 'text-amber-400 border-amber-500/20 hover:border-amber-500/40' },
                                ].map(hint => (
                                    <button
                                        key={hint.label}
                                        type="button"
                                        onClick={() => setSearch(hint.value)}
                                        className={`text-[11px] font-mono px-2.5 py-1 rounded-md bg-white/5 border hover:bg-white/10 transition-colors ${hint.color}`}
                                    >
                                        {hint.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Command.Group heading="Quick Actions">
                        {(search.toLowerCase().startsWith('task:') || search.toLowerCase().startsWith('task ') ||
                            search.toLowerCase().startsWith('note:') || search.toLowerCase().startsWith('note ') ||
                            search.toLowerCase().startsWith('focus:') || search.toLowerCase().startsWith('focus ')) ? (
                            <Command.Item onSelect={handleInlineCreate} forceMount>
                                <Zap className="mr-2 w-4 h-4 text-amber-400" />
                                <span>Create: <strong>{search}</strong></span>
                            </Command.Item>
                        ) : (
                            <>
                                <Command.Item onSelect={() => runCommand(() => router.push("/createtask"))}>
                                    <Plus className="mr-2 w-4 h-4 text-purple-400" />
                                    <span>Create New Task</span>
                                </Command.Item>
                                <Command.Item onSelect={() => runCommand(() => router.push("/planner"))}>
                                    <CalendarDays className="mr-2 w-4 h-4 text-pink-400" />
                                    <span>Schedule Study Session</span>
                                </Command.Item>
                                <Command.Item onSelect={() => runCommand(() => router.push("/dashboard"))}>
                                    <FileText className="mr-2 w-4 h-4 text-indigo-400" />
                                    <span>Jot down a note</span>
                                </Command.Item>
                            </>
                        )}
                    </Command.Group>

                    <Command.Separator />

                    <Command.Group heading="Navigation">
                        <Command.Item onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <BarChart2 className="mr-2 w-4 h-4 text-slate-400" />
                            <span>Dashboard</span>
                        </Command.Item>
                        <Command.Item onSelect={() => runCommand(() => router.push("/tasks"))}>
                            <CheckSquare className="mr-2 w-4 h-4 text-emerald-400" />
                            <span>Tasks Overview</span>
                        </Command.Item>
                        <Command.Item onSelect={() => runCommand(() => router.push("/habits"))}>
                            <Flame className="mr-2 w-4 h-4 text-orange-400" />
                            <span>Habit Gallery</span>
                        </Command.Item>
                        <Command.Item onSelect={() => runCommand(() => router.push("/analytics/overview"))}>
                            <BarChart2 className="mr-2 w-4 h-4 text-slate-400" />
                            <span>Analytics Overview</span>
                        </Command.Item>
                        <Command.Item onSelect={() => runCommand(() => router.push("/exam-warroom/overview"))}>
                            <Swords className="mr-2 w-4 h-4 text-rose-400" />
                            <span>Exam War Room</span>
                        </Command.Item>
                        <Command.Item onSelect={() => runCommand(() => router.push("/achievements"))}>
                            <GraduationCap className="mr-2 w-4 h-4 text-yellow-400" />
                            <span>Achievements</span>
                        </Command.Item>
                        <Command.Item onSelect={() => runCommand(() => router.push("/family-connect"))}>
                            <Users className="mr-2 w-4 h-4 text-blue-400" />
                            <span>Family Connect</span>
                        </Command.Item>
                    </Command.Group>
                </Command.List>
            </Command>
        </div>
    );
}
