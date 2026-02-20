'use client';

import { FileText, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { useGetNotesQuery, useDeleteNoteMutation, Note } from '@repo/store';

export function NotesWidget() {
    const { data: notesData, isLoading } = useGetNotesQuery();
    const [deleteNoteMutation] = useDeleteNoteMutation();

    const notes: Note[] = notesData?.notes || [];

    const handleDelete = async (id: string) => {
        try {
            await deleteNoteMutation(id).unwrap();
        } catch (_e) {
            console.error("Failed to delete note");
        }
    };

    if (isLoading) {
        return (
            <Card variant="glass" className="h-full">
                <CardHeader className="pb-3 border-b border-white/5">
                    <CardTitle className="flex items-center gap-2 text-white">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        Quick Notes
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex items-center justify-center">
                    <div className="animate-pulse space-y-3 w-full">
                        <div className="h-20 bg-white/5 rounded-xl w-full"></div>
                        <div className="h-20 bg-white/5 rounded-xl w-full"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card variant="glass" className="h-full">
            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    Quick Notes
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                {notes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium text-slate-400">No notes yet.</p>
                        <p className="text-[11px] mt-1">Use Quick Actions to jot down a thought.</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        {notes.map(note => (
                            <div key={note.id} className="relative group p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed pr-6">{note.content}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        {new Date(note.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400"
                                    title="Delete Note"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
