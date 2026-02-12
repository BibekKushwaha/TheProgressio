// components/task/TaskHeader.tsx
"use client"
import { ChevronRight, Edit, Flag, Tag } from 'lucide-react';
import Link from 'next/link';
import { useGetTaskByIdQuery } from '@repo/store';
import { useRouter, useParams } from 'next/navigation';

export function SingleTaskHeader() {
    const router = useRouter();
    const { id } = useParams()
    const taskId = typeof id === 'string' ? id : undefined
    const { data: task } = useGetTaskByIdQuery(taskId || '', { skip: !taskId })
    if (!taskId) return null

    return (
        <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                <Link href="/planner"><span>Tasks</span></Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-indigo-400">{task?.category?.name}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                        {task?.title}
                    </h1>

                    <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-sm font-semibold text-red-400">
                            <Flag className="w-4 h-4" />
                            {task?.priority}
                        </span>

                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm font-semibold text-blue-400">
                            <Tag className="w-4 h-4" />
                            {task?.category?.name}
                        </span>

                        <Link href="/planner" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/10 transition-all duration-300">
                            {task?.status}
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
                <button
                    onClick={() => router.push(`/createtask?id=${taskId}`)}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                    <Edit className="w-4 h-4" />
                    Edit Task
                </button>
            </div>
        </div>
    );
}