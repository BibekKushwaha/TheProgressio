'use client';

import { Clock, Flag, MoreVertical, Trash2, CheckCircle, XCircle, Edit, Paperclip, Sparkles, Loader2, BellRing, MessageSquare } from 'lucide-react';
import { Task, PriorityEnum, TaskStatus, useDeleteTaskMutation, useToggleTaskMutation, useGenerateSubtasksMutation, useCreateRevisionDripCampaignMutation, useComposeNotificationMutation } from '@repo/store';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { formatDueDate } from '@/lib/date';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface TaskCardProps {
    task: Task;
    completed: boolean;
}

const PRIORITY_COLORS = {
    [PriorityEnum.HIGH]: 'text-red-400 bg-red-500/20 border-red-500/30',
    [PriorityEnum.MEDIUM]: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    [PriorityEnum.LOW]: 'text-green-400 bg-green-500/20 border-green-500/30',
};

export function TaskCard({ task, completed }: TaskCardProps) {
    const router = useRouter();
    const [deleteTask] = useDeleteTaskMutation();
    const [toggleTask] = useToggleTaskMutation();
    const [generateSubtasks, { isLoading: isBreakingDown }] = useGenerateSubtasksMutation();
    const [createRevisionCampaign] = useCreateRevisionDripCampaignMutation();
    const [composeNotification] = useComposeNotificationMutation();
    const [nudgeOpen, setNudgeOpen] = useState(false);
    const [nudgeMessage, setNudgeMessage] = useState('');

    const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS[PriorityEnum.LOW];
    const categoryColor = task.category?.colorCode || '#6B7280'; // Default gray
    const categoryName = task.category?.name || 'No Category';

    const isFamilyView = typeof window !== 'undefined' ? !!localStorage.getItem('family_share_token') : false;

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirmOpen(true);
    };

    const performDelete = async () => {
        try {
            await deleteTask(task.id).unwrap();
            toast.success('Task deleted');
        } catch (err) {
            toast.error('Failed to delete task');
            console.error('Failed to delete task:', err);
        }
    };

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const result = await toggleTask(task.id).unwrap();
            const statusLabel = result.status === TaskStatus.COMPLETED ? 'completed' :
                result.status === TaskStatus.IN_PROGRESS ? 'started' : 'reset';
            toast.success(`Task ${statusLabel}`);
        } catch (err) {
            toast.error('Failed to update task status');
            console.error(err);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/createtask?id=${task.id}`);
    };

    const handleCardClick = () => {
        router.push(`/tasks/${task.id}`);
    };

    const handleBreakDown = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await generateSubtasks(task.id).unwrap();
            toast.success('Task broken down into subtasks');
        } catch (err) {
            toast.error('AI breakdown failed');
            console.error(err);
        }
    };

    const handleCreateRevision = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await createRevisionCampaign({
                examTitle: task.title,
                examDate: task.dueDate || new Date().toISOString(),
                chapter: task.category?.name || 'General'
            }).unwrap();
            toast.success('Revision drip campaign scheduled!');
        } catch (err) {
            toast.error('Failed to schedule revision campaign');
            console.error(err);
        }
    };

    const handleSendNudge = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNudgeMessage('');
        setNudgeOpen(true);
    };

    const handleSendNudgeConfirm = async () => {
        if (!nudgeMessage.trim()) return;
        try {
            await composeNotification({
                category: 'BEHAVIORAL_NUDGE',
                title: `Family Nudge: ${task.title}`,
                body: nudgeMessage,
                priority: 'HIGH',
                deepLink: '/dashboard'
            }).unwrap();
            toast.success('Nudge sent to student');
            setNudgeOpen(false);
        } catch (err) {
            toast.error('Failed to send nudge');
            console.error(err);
        }
    };

    return (
        <div
            className={`group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-5 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer ${completed ? 'opacity-60' : ''
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <span
                    className={`px-3 py-1 rounded-lg text-xs font-semibold text-white/90`}
                    style={{ backgroundColor: categoryColor }}
                >
                    {categoryName}
                </span>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-2.5 py-1 ${priorityColor} border rounded-lg text-xs font-semibold`}>
                        <Flag className="w-3 h-3" />
                        {task.priority}
                    </span>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="p-1 hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="w-4 h-4 text-slate-400" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {!isFamilyView && (
                                <>
                                    <DropdownMenuItem onClick={handleEdit} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleCreateRevision} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                        <BellRing className="w-4 h-4 mr-2 text-yellow-400" />
                                        Schedule Revision
                                    </DropdownMenuItem>
                                </>
                            )}
                            {isFamilyView && (
                                <DropdownMenuItem onClick={handleSendNudge} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    <MessageSquare className="w-4 h-4 mr-2 text-blue-400" />
                                    Send Nudge
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={handleCardClick} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                <Clock className="w-4 h-4 mr-2 text-indigo-400" />
                                Focus
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleToggle} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                {task.status === TaskStatus.PENDING && (
                                    <>
                                        <Clock className="w-4 h-4 mr-2 text-blue-400" />
                                        <span>Start Task</span>
                                    </>
                                )}
                                {task.status === TaskStatus.IN_PROGRESS && (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                                        <span>Complete Task</span>
                                    </>
                                )}
                                {task.status === TaskStatus.COMPLETED && (
                                    <>
                                        <XCircle className="w-4 h-4 mr-2 text-slate-400" />
                                        <span>Reset Task</span>
                                    </>
                                )}
                            </DropdownMenuItem>
                            {!isFamilyView && (
                                <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div onClick={handleCardClick}>
                <h3 className={`text-lg font-bold mb-2 text-white ${completed ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                </h3>

                {task.description && (
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{task.description}</p>
                )}

                {task.subtasks && task.subtasks.length > 0 && (() => {
                    const total = task.subtasks.length;
                    const done = task.subtasks.filter(s => s.completed).length;
                    const pct = Math.round((done / total) * 100);
                    return (
                        <div className="mt-3 mb-1">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-semibold text-slate-400 tracking-wide">
                                    {done}/{total} subtasks
                                </span>
                                <span className={`text-[11px] font-bold tracking-wide ${pct === 100 ? 'text-green-400' : 'text-purple-400'}`}>
                                    {pct}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${pct === 100
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                        : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                        }`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })()}

                {/* ✨ Break it down — AI decomposition button */}
                {!completed && (!task.subtasks || task.subtasks.length === 0) && (
                    <button
                        onClick={handleBreakDown}
                        disabled={isBreakingDown}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-all disabled:opacity-50"
                    >
                        {isBreakingDown ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {isBreakingDown ? 'Breaking down...' : '✨ Break it down'}
                    </button>
                )}

                <div className="flex items-center justify-between mt-4">
                    <div className={`flex items-center gap-2 text-sm ${!completed && task.dueDate && new Date(task.dueDate) < new Date() && formatDueDate(task.dueDate).includes('overdue')
                            ? 'text-rose-400 font-bold'
                            : 'text-slate-400'
                        }`}>
                        <Clock className={`w-4 h-4 ${!completed && task.dueDate && new Date(task.dueDate) < new Date() && formatDueDate(task.dueDate).includes('overdue') ? 'text-rose-400 animate-pulse' : ''}`} />
                        <span>{formatDueDate(task.dueDate)}</span>
                    </div>
                    {task.attachments && task.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg">
                            <Paperclip className="w-3 h-3" />
                            <span>{task.attachments.length}</span>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={nudgeOpen} onOpenChange={setNudgeOpen}>
                <DialogContent className="bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Send Nudge</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-400 mb-2">Enter a message to encourage the student about <span className="font-semibold text-slate-200">{task.title}</span>:</p>
                    <Input
                        autoFocus
                        value={nudgeMessage}
                        onChange={(e) => setNudgeMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendNudgeConfirm()}
                        placeholder="e.g. You're doing great, keep it up!"
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    />
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setNudgeOpen(false)} className="bg-white/5 border-white/10 text-slate-300">
                            Cancel
                        </Button>
                        <Button onClick={handleSendNudgeConfirm} disabled={!nudgeMessage.trim()} className="bg-indigo-600 hover:bg-indigo-500">
                            <BellRing className="w-4 h-4 mr-2" />
                            Send Nudge
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="Delete Task"
                description="Are you sure you want to delete this task? This action cannot be undone."
                confirmLabel="Delete"
                onConfirm={performDelete}
            />
        </div>
    );
}