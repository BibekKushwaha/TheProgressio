"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckSquare, CalendarDays, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCreateNoteMutation } from '@repo/store';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function MobileFAB() {
    const [isOpen, setIsOpen] = useState(false);
    const [noteDialogOpen, setNoteDialogOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    const router = useRouter();
    const [createNote, { isLoading: isCreating }] = useCreateNoteMutation();

    const handleSaveNote = async () => {
        if (!noteText.trim()) return;
        try {
            await createNote({ content: noteText }).unwrap();
            setNoteDialogOpen(false);
            setNoteText('');
            toast.success('Note saved!');
        } catch {
            toast.error('Failed to save note. Please try again.');
        }
    };

    const actions = [
        { icon: CheckSquare, label: 'New Task',   onAction: () => router.push('/createtask'), color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
        { icon: CalendarDays, label: 'Schedule',  onAction: () => router.push('/planner'),    color: 'text-pink-400',    bg: 'bg-pink-500/20'    },
        { icon: FileText,     label: 'Quick Note', onAction: () => { setIsOpen(false); setNoteDialogOpen(true); }, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
    ];

    return (
        <div className="md:hidden">
            {/* Backdrop overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[90]"
                    />
                )}
            </AnimatePresence>

            <div className="fixed bottom-24 right-5 z-[100] flex flex-col items-end">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="flex flex-col items-end gap-3 mb-4"
                        >
                            {actions.map((action, i) => {
                                const Icon = action.icon;
                                return (
                                    <motion.button
                                        key={action.label}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0, transition: { delay: (actions.length - 1 - i) * 0.05 } }}
                                        exit={{ opacity: 0, x: 20, transition: { delay: i * 0.05 } }}
                                        onClick={() => {
                                            action.onAction();
                                        }}
                                        aria-label={action.label}
                                        className="flex items-center gap-3 relative z-[100]"
                                    >
                                        <span className="bg-slate-900/90 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg border border-white/10 backdrop-blur-md">
                                            {action.label}
                                        </span>
                                        <div className={`w-12 h-12 flex items-center justify-center rounded-full border border-white/10 shadow-xl backdrop-blur-xl ${action.bg}`}>
                                            <Icon className={`w-5 h-5 ${action.color}`} />
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
                    aria-expanded={isOpen}
                    className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] focus:outline-none transition-shadow relative z-[100]"
                >
                    <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
                        <Plus className="w-6 h-6" />
                    </motion.div>
                </button>
            </div>

            {/* Quick Note dialog — triggered by FAB menu item */}
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
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
                            placeholder="Jot down a quick thought, class note, or reminder…"
                            className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-sm leading-relaxed"
                            autoFocus
                        />
                        <Button
                            onClick={handleSaveNote}
                            disabled={!noteText.trim() || isCreating}
                            className="btn-primary w-full"
                        >
                            {isCreating ? 'Saving…' : 'Save Note'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
