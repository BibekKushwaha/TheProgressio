"use client";

import { Plus, FileText, Sparkles } from 'lucide-react';
import { StartFocusButton } from '../planner/StartFocusButton';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addTask, PriorityEnum, TaskStatus, useAppDispatch, useCreateNoteMutation, useCreateTaskMutation, useGetTasksQuery } from '@repo/store';
import { toast } from 'sonner';

export function QuickActions() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [firstTaskTitle, setFirstTaskTitle] = useState('');
    const [createNote, { isLoading: isCreating }] = useCreateNoteMutation();
    const [createTask, { isLoading: isCreatingTask }] = useCreateTaskMutation();
    const { data: taskList } = useGetTasksQuery({ page: 1, limit: 1 });
    const hasAnyTasks = (taskList?.length ?? 0) > 0;

    const handleSaveNote = async () => {
        if (!noteText.trim()) return;

        try {
            await createNote({ content: noteText }).unwrap();
            setIsNoteDialogOpen(false);
            setNoteText('');
            toast.success('Note saved!');
        } catch (_e) {
            toast.error('Failed to save note. Please try again.');
        }
    };

    const handleCreateFirstTask = async () => {
        const title = firstTaskTitle.trim();
        if (!title) return;

        try {
            const task = await createTask({
                title,
                status: TaskStatus.PENDING,
                priority: PriorityEnum.LOW,
            }).unwrap();
            dispatch(addTask(task));
            setFirstTaskTitle('');
            toast.success('First task created!', {
                description: 'You can add AI subtasks or more details next.',
                action: {
                    label: 'Add details',
                    onClick: () => router.push(`/createtask?id=${task.id}`),
                },
            });
        } catch {
            toast.error('Failed to create task. Please try again.');
        }
    };

    const actionButtons = [
        {
            label: 'Add New Task',
            icon: Plus,
            onClick: () => router.push('/createtask'),
            className:
                'w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 active:scale-95',
        },
        {
            label: 'New Note',
            icon: FileText,
            onClick: () => setIsNoteDialogOpen(true),
            className:
                'w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 active:scale-95 text-indigo-300 hover:text-indigo-200',
        },
    ];

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 relative overflow-hidden group">
            {/* Decorative background sparkle */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full group-hover:bg-purple-500/20 transition-all duration-700"></div>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                Quick Actions
                <Sparkles className="w-5 h-5 text-purple-400 opacity-50" />
            </h2>

            <div className="space-y-3">
                {!hasAnyTasks && (
                    <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                        <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-purple-300/80">Start here</div>
                        <div className="mb-3 text-sm text-slate-200">Type your first study task and create it without leaving the dashboard.</div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                value={firstTaskTitle}
                                onChange={(e) => setFirstTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void handleCreateFirstTask();
                                    }
                                }}
                                placeholder="e.g. Revise cell biology for 30 minutes"
                                className="h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                            <Button
                                onClick={() => void handleCreateFirstTask()}
                                disabled={!firstTaskTitle.trim() || isCreatingTask}
                                className="btn-primary w-full sm:w-auto"
                            >
                                {isCreatingTask ? 'Creating…' : 'Create first task'}
                            </Button>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push(`/createtask${firstTaskTitle.trim() ? `?title=${encodeURIComponent(firstTaskTitle.trim())}` : ''}`)}
                            className="mt-2 text-xs font-medium text-purple-300 transition-colors hover:text-purple-200"
                        >
                            Open full task editor instead
                        </button>
                    </div>
                )}

                <StartFocusButton isInline={true} />

                <div className="grid grid-cols-2 gap-3">
                    {actionButtons.map((button) => {
                        const Icon = button.icon;
                        return (
                            <button key={button.label} onClick={button.onClick} className={button.className}>
                                <Icon className="w-5 h-5 mb-1" />
                                <span className="text-xs">{button.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-xl text-white">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            Quick Note
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Capture a thought, class note, or reminder — saved instantly.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Jot down a quick thought, class note, or reminder..."
                            className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-sm leading-relaxed"
                            autoFocus
                        />
                        <Button
                            onClick={handleSaveNote}
                            disabled={!noteText.trim() || isCreating}
                            className="btn-primary w-full"
                        >
                            {isCreating ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Saving…
                                </span>
                            ) : "Save Note"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
