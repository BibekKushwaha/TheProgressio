'use client';

import { Paperclip, Trash2, ExternalLink } from 'lucide-react';
import { Attachment, useDeleteAttachmentMutation } from '@repo/store';
import { useState } from 'react';

interface AttachmentListProps {
    attachments: Attachment[];
    taskId: string;
    editable?: boolean;
}

export function AttachmentList({ attachments, taskId, editable = false }: AttachmentListProps) {
    const [deleteAttachment] = useDeleteAttachmentMutation();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (attachmentId: string) => {
        if (!confirm('Delete this attachment?')) return;

        setDeletingId(attachmentId);
        try {
            await deleteAttachment({ id: attachmentId, taskId }).unwrap();
        } catch (error) {
            console.error('Failed to delete attachment:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const formatFileSize = (size?: string | null) => {
        if (!size) return '';
        const bytes = parseInt(size);
        if (Number.isNaN(bytes)) return size;

        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!attachments || attachments.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Paperclip className="w-3 h-3" />
                <span>Attachments ({attachments.length})</span>
            </div>

            <div className="space-y-2">
                {attachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="group flex items-center justify-between gap-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                                <Paperclip className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {attachment.name}
                                </p>
                                {attachment.size && (
                                    <p className="text-xs text-slate-500">
                                        {formatFileSize(attachment.size)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Open"
                            >
                                <ExternalLink className="w-4 h-4 text-slate-400" />
                            </a>

                            {editable && (
                                <button
                                    onClick={() => handleDelete(attachment.id)}
                                    disabled={deletingId === attachment.id}
                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
