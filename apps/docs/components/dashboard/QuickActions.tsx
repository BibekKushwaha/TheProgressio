"use client";

import { Plus, FileText, Sparkles } from 'lucide-react';
import { StartFocusButton } from '../planner/StartFocusButton';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCreateNoteMutation } from '@repo/store';

export function QuickActions() {
    const router = useRouter();
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [createNote, { isLoading: isCreating }] = useCreateNoteMutation();

    const handleSaveNote = async () => {
        if (!noteText.trim()) return;

        try {
            await createNote({ content: noteText }).unwrap();
            setIsNoteDialogOpen(false);
            setNoteText('');
        } catch (_e) {
            console.error("Failed to create note");
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
                <StartFocusButton isInline={true} />

                {actionButtons.map((button) => {
                    const Icon = button.icon;
                    return (
                        <button key={button.label} onClick={button.onClick} className={button.className}>
                            <Icon className="w-5 h-5" />
                            {button.label}
                        </button>
                    );
                })}
            </div>

            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-xl text-white">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            Quick Note
                        </DialogTitle>
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
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl"
                        >
                            {isCreating ? "Saving..." : "Save Note"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
