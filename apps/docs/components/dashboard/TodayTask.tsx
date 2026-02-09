"use client";

import React from 'react';
import { ChevronRight, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useGetTasksQuery, useToggleTaskMutation, TaskStatus, PriorityEnum } from '@repo/store';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export function TodaysTasks() {
    const today = new Date().toISOString().split('T')[0];
    const { data: tasks, isLoading } = useGetTasksQuery({ date: today });
    const [toggleTask] = useToggleTaskMutation();

    const getPriorityStyle = (priority: string, status: string) => {
        if (status === TaskStatus.COMPLETED) {
            return 'text-green-400 bg-green-500/20 border-green-500/30';
        }
        switch (priority) {
            case PriorityEnum.HIGH:
                return 'text-red-400 bg-red-500/20 border-red-500/30';
            case PriorityEnum.MEDIUM:
                return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
            case PriorityEnum.LOW:
                return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
            default:
                return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
        }
    };

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return 'No time set';
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleToggle = async (id: string) => {
        try {
            await toggleTask(id).unwrap();
        } catch (error) {
            console.error('Failed to toggle task:', error);
        }
    };

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Today's Tasks</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {isLoading ? <Skeleton className="h-4 w-32 bg-white/5" /> : (tasks?.length ? `${tasks.filter(t => t.status === TaskStatus.COMPLETED).length}/${tasks.length} completed` : 'Get started with your goals')}
                    </p>
                </div>
                <Link href="/planner" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-all duration-300 font-semibold group">
                    Planner
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />
                        ))}
                    </div>
                ) : tasks && tasks.length > 0 ? (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`group flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 ${task.status === TaskStatus.COMPLETED ? 'bg-white/[0.02] border-white/5' : ''}`}
                        >
                            <button
                                onClick={() => handleToggle(task.id)}
                                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                            >
                                {task.status === TaskStatus.COMPLETED ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                ) : (
                                    <Circle className="w-6 h-6 text-slate-500 group-hover:text-purple-400 transition-colors" />
                                )}
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className={`font-semibold mb-1 truncate ${task.status === TaskStatus.COMPLETED ? 'line-through text-slate-500' : 'text-white'}`}>
                                    {task.title}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium tracking-wide">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(task.dueDate)}
                                </div>
                            </div>

                            <span
                                className={`px-2.5 py-1 border rounded-lg text-[10px] font-black tracking-widest uppercase transition-colors ${getPriorityStyle(task.priority, task.status)}`}
                            >
                                {task.status === TaskStatus.COMPLETED ? 'Done' : task.priority}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                        <p className="text-slate-400 text-sm italic font-medium">No tasks scheduled for today.</p>
                        <Link href="/planner" className="mt-3 inline-block text-xs bg-purple-500/10 text-purple-400 px-4 py-2 rounded-full hover:bg-purple-500/20 transition-all">
                            + Add a task
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}