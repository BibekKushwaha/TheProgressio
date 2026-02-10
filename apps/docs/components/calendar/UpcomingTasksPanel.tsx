"use client";
import { ScheduleItemCard } from './ScheduleItemCard';
import { useGetTasksQuery, TaskStatus } from '@repo/store';

export function UpcomingTasksPanel() {
    // Fetch pending tasks
    const { data: tasks, isLoading } = useGetTasksQuery({
        status: TaskStatus.PENDING
    });

    // Sort by due date (ascending)
    const sortedTasks = [...(tasks || [])].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-2xl p-6 h-[calc(100vh-12rem)] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-1 text-white">Upcoming Tasks</h2>
                        <p className="text-purple-400 font-semibold">
                            Next Actions
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {isLoading && <div className="text-center text-slate-400">Loading tasks...</div>}

                    {!isLoading && sortedTasks.length === 0 && (
                        <div className="text-center text-slate-400 py-4">
                            No upcoming tasks! 🎉
                        </div>
                    )}

                    {sortedTasks.map((task) => (
                        <ScheduleItemCard
                            key={task.id}
                            item={{
                                id: task.id,
                                type: 'task',
                                title: task.title,
                                time: task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    : 'No Date',
                                subtitle: task.priority,
                                location: task.category?.name || 'General',
                                color: task.priority === 'HIGH' ? 'orange' : task.priority === 'MEDIUM' ? 'blue' : 'gray',
                                progress: 0
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
