"use client"

import { RecoveryModePanel } from '@/components/planner/RecoveryModePanel'
import { useGetTasksQuery, useLocalTasks } from '@repo/store';
import React, { useMemo } from 'react'
import { AlertCircle, Zap, Clock } from 'lucide-react';
import { mergeTaskSources } from '@/lib/mergeTasks';

const PlannerPage = () => {
    const { data: allTasks } = useGetTasksQuery({ page: 1, limit: 50 });
    const { tasks: cachedTasks } = useLocalTasks();
    
    const tasks = useMemo(
        () => mergeTaskSources(allTasks || [], cachedTasks),
        [allTasks, cachedTasks]
    );

    // Calculate task metrics
    const metrics = useMemo(() => {
        const now = new Date();
        let overdue = 0;
        let dueToday = 0;
        let pending = 0;
        let completed = 0;

        const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

        tasks.forEach((task) => {
            if (task.status === 'COMPLETED') {
                completed++;
                return;
            }
            if (!task.dueDate) {
                pending++;
                return;
            }

            const dueDate = new Date(task.dueDate);
            const dueKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;

            if (dueDate < now && dueKey !== todayKey) {
                overdue++;
            } else if (dueKey === todayKey) {
                dueToday++;
            }
        });

        return { overdue, dueToday, pending, completed, total: tasks.length };
    }, [tasks]);

    return (
        <div className="flex-1 flex flex-col py-4">
            {/* Header Section */}
            <div className="pb-4 border-b border-white/10">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Recovery Planner</h1>
                        <p className="text-slate-400 text-lg">Get your tasks back on track with AI-powered recovery planning</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {/* Overdue */}
                        <div className="rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <p className="text-xs font-semibold text-red-300">Overdue</p>
                            </div>
                            <p className="text-2xl font-bold text-white">{metrics.overdue}</p>
                        </div>

                        {/* Due Today */}
                        <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="w-4 h-4 text-amber-400" />
                                <p className="text-xs font-semibold text-amber-300">Due Today</p>
                            </div>
                            <p className="text-2xl font-bold text-white">{metrics.dueToday}</p>
                        </div>

                        {/* Pending */}
                        <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-4 h-4 text-blue-400" />
                                <p className="text-xs font-semibold text-blue-300">Pending</p>
                            </div>
                            <p className="text-2xl font-bold text-white">{metrics.pending}</p>
                        </div>

                        {/* Total */}
                        <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-green-300">Total Tasks</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{metrics.total}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 mt-6">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden">
                    <div className="p-6">
                        <RecoveryModePanel tasks={tasks} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlannerPage;
