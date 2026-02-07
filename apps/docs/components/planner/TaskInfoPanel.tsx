// components/task/TaskInfoPanel.tsx
'use client'
import { Calendar, Clock, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useGetTaskByIdQuery } from '@repo/store';

function formatDueDate(dueDate?: string | null) {
    if (!dueDate) return "No due date";

    const date = new Date(dueDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const diffDays =
        (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 1 && diffDays <= 7) return "Next week";

    // fallback
    return target.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function calculateTimeRemaining(dueDate?: string | null) {
    if (!dueDate) return "N/A";

    const now = new Date();
    const target = new Date(dueDate);
    const diffMs = target.getTime() - now.getTime();

    if (diffMs < 0) return "Overdue";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
        return `${diffDays}d ${diffHours}h`;
    }
    if (diffHours > 0) {
        return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
}

export function TaskInfoPanel() {
    const { id: taskId } = useParams()
    const { data: task } = useGetTaskByIdQuery(taskId as string)

    const timeRemaining = calculateTimeRemaining(task?.dueDate);
    const isOverdue = timeRemaining === "Overdue";

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-6">Task Info</h2>

            <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Calendar className="w-5 h-5" />
                        <span>Due Date</span>
                    </div>
                    <div className="font-semibold text-right">
                        <div className={isOverdue ? "text-red-400" : ""}>{formatDueDate(task?.dueDate)}</div>
                    </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Clock className="w-5 h-5" />
                        <span>Time Remaining</span>
                    </div>
                    <div className={`font-semibold ${isOverdue ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`}>
                        {timeRemaining}
                    </div>
                </div>

                <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3 text-slate-400">
                        <User className="w-5 h-5" />
                        <span>Assigned to</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-sm">
                            AS
                        </div>
                        <span className="font-semibold">You</span>
                    </div>
                </div>
            </div>
        </div>
    );
}