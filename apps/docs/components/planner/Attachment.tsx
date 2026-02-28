'use client';

import { Download, Trash2, Plus, Link as LinkIcon } from 'lucide-react';
import { useGetTaskByIdQuery, useCreateAttachmentMutation, useDeleteAttachmentMutation } from '@repo/store';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTaskRouteId } from '@/hooks/useTaskRouteId';

export function AttachmentsList() {
    const taskId = useTaskRouteId();
    const { data: task } = useGetTaskByIdQuery(taskId || '', { skip: !taskId });
    const [createAttachment] = useCreateAttachmentMutation();
    const [deleteAttachment] = useDeleteAttachmentMutation();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!name || !url || !taskId) return;
        try {
            await createAttachment({ taskId, name, url }).unwrap();
            setName('');
            setUrl('');
            setIsAddOpen(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = (id: string) => {
        setPendingDeleteId(id);
    };

    const performDelete = async () => {
        if (!pendingDeleteId) return;
        if (!taskId) return;
        await deleteAttachment({ id: pendingDeleteId, taskId });
        setPendingDeleteId(null);
    };

    const attachments = task?.attachments || [];

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Attachments</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddOpen(true)}
                    className="border-white/10 hover:bg-white/5 text-slate-300"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Link
                </Button>
            </div>

            {attachments.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10 text-slate-500">
                    No attachments yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {attachments.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300 group relative"
                        >
                            <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                <LinkIcon className="w-6 h-6 text-indigo-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate text-white">{file.name}</div>
                                <div className="text-sm text-slate-400">
                                    {file.size || 'Link'} • {new Date(file.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all duration-300 flex-shrink-0"
                                >
                                    <Download className="w-4 h-4 text-slate-300" />
                                </a>
                                <button
                                    onClick={() => handleDelete(file.id)}
                                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-300 flex-shrink-0 opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add Attachment Link</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Link Name</label>
                            <Input
                                placeholder="e.g., Reference Document"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">URL</label>
                            <Input
                                placeholder="https://..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} className="border-white/10 text-slate-300">
                            Cancel
                        </Button>
                        <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Add
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={!!pendingDeleteId}
                onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
                title="Delete Attachment"
                description="Delete this attachment? This cannot be undone."
                confirmLabel="Delete"
                onConfirm={performDelete}
            />
        </div>
    );
}