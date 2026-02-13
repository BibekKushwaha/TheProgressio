"use client";

import { useMemo } from "react";
import { Calendar, Clock } from "lucide-react";
import { useGetTasksQuery, Task } from "@repo/store";
import { getTodayDateKey, toLocalDateKey } from "@/lib/date";

export function UpcomingTasksPanel() {
    const { data: tasks, isLoading } = useGetTasksQuery({ page: 1, limit: 500 });

    const upcomingTasks = useMemo(() => {
        if (!tasks) return [] as Task[];
        const todayString = getTodayDateKey();
        if (!todayString) return [] as Task[];
        return tasks
            .filter((task) => {
                if (!task.dueDate) return false;
                const dueDate = new Date(task.dueDate!);
                const dueDateString = toLocalDateKey(dueDate);
                return !isNaN(dueDate.getTime()) && dueDateString && dueDateString >= todayString;
            })
            .sort((a, b) => {
                const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                return aDate - bDate;
            })
            .slice(0, 6);
    }, [tasks]);

    return (
        <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">Upcoming Tasks</h3>
                    <p className="text-xs text-slate-400">Next due items</p>
                </div>
                <Calendar className="w-5 h-5 text-violet-400" />
            </div>

            {isLoading ? (
                <div className="text-sm text-slate-400">Loading tasks...</div>
            ) : upcomingTasks.length === 0 ? (
                <div className="text-sm text-slate-400">No upcoming tasks.</div>
            ) : (
                <div className="space-y-3">
                    {upcomingTasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="mt-1 h-2 w-2 rounded-full bg-violet-400" />
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-white truncate">{task.title}</div>
                                {task.description && (
                                    <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{task.description}</div>
                                )}
                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
