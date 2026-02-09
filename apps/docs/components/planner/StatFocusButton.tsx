'use client';

import { Play, Focus, Target } from 'lucide-react';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGetTasksQuery, TaskStatus, Task } from '@repo/store';

interface StartFocusButtonProps {
    taskId?: string;
    isInline?: boolean;
}

export function StartFocusButton({ taskId: propTaskId, isInline = false }: StartFocusButtonProps) {
    const params = useParams();
    const router = useRouter();
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const taskId = propTaskId || activeTaskId || params?.id as string;
    const [showTaskSelector, setShowTaskSelector] = useState(false);

    const { data: tasks } = useGetTasksQuery({ status: TaskStatus.PENDING });

    const handleStart = () => {
        if (!taskId) {
            setShowTaskSelector(true);
            return;
        }

        // Find task title if possible
        const task = tasks?.find((t: Task) => t.id === taskId);
        const taskTitle = task ? task.title : 'Focus Session';

        router.push(`/focus-session?taskId=${taskId}&task=${encodeURIComponent(taskTitle)}&duration=25`);
    };

    // If no taskId and we're in the floating/fixed mode, we usually hide? 
    // Actually, let's keep it visible so users can select a task from anywhere.
    // if (!taskId && !isInline && !showTaskSelector) return null;

    const buttonClass = isInline
        ? "w-full focus:outline-none"
        : "fixed bottom-8 right-8 z-50 flex flex-col items-center gap-2 px-8 py-4 rounded-2xl font-semibold shadow-2xl transition-all duration-300 hover:-translate-y-1";

    const activeColors = "bg-gradient-to-r from-red-600 to-orange-600 shadow-red-500/30 hover:shadow-red-500/50";
    const inactiveColors = "bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-500/50";

    const baseStyles = "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg active:scale-95 hover:-translate-y-1";

    if (showTaskSelector && !taskId) {
        return (
            <div className={isInline ? "w-full bg-white/5 border border-white/10 p-4 rounded-xl" : "fixed bottom-8 right-8 z-50 w-72 bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl"}>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-2 text-slate-300">
                    <Target className="w-4 h-4 text-purple-400" />
                    SELECT TASK TO FOCUS
                </h3>
                <div className="max-h-48 overflow-auto space-y-1 pr-1 custom-scrollbar">
                    {tasks?.filter((t: Task) => t.status !== 'COMPLETED').map((task: Task) => (
                        <button
                            key={task.id}
                            onClick={() => {
                                setActiveTaskId(task.id);
                                setShowTaskSelector(false);
                                router.push(`/focus-session?taskId=${task.id}&task=${encodeURIComponent(task.title)}&duration=25`);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-500/20 text-xs truncate transition-colors text-slate-300 hover:text-white border border-transparent hover:border-purple-500/30"
                        >
                            {task.title}
                        </button>
                    ))}
                    {(!tasks || tasks.length === 0) && (
                        <p className="text-[10px] text-slate-500 italic p-2">No active tasks today</p>
                    )}
                </div>
                <button
                    onClick={() => setShowTaskSelector(false)}
                    className="w-full mt-3 text-[10px] uppercase tracking-widest font-black text-slate-500 hover:text-white transition-colors"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleStart}
            className={isInline ? `${baseStyles} ${inactiveColors}` : `${buttonClass} ${inactiveColors}`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-white/20 rounded-full flex items-center justify-center`}>
                    <Play className="w-5 h-5 fill-current ml-1" />
                </div>
                <div className="flex flex-col items-start">
                    <span className={isInline ? "text-base font-bold" : "text-lg font-mono"}>Start Focus Session</span>
                    {!isInline && (
                        <span className="text-xs uppercase tracking-wider text-indigo-200">
                            25:00 • Pomodoro
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}