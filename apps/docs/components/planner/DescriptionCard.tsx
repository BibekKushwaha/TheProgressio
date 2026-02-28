// components/task/DescriptionCard.tsx
'use client';

import { SubTaskList } from './SubTaskList';
import { useGetTaskByIdQuery } from '@repo/store';
import { useTaskRouteId } from '@/hooks/useTaskRouteId';

export function DescriptionCard() {
    const taskId = useTaskRouteId();
    const { data: task } = useGetTaskByIdQuery(taskId || '', { skip: !taskId });

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h2 className="text-2xl font-bold mb-4">Description</h2>

            <p className="text-slate-300 mb-6 leading-relaxed whitespace-pre-wrap">
                {task?.description || "No description provided."}
            </p>


            {task && <SubTaskList taskId={task.id} subtasks={task.subtasks || []} />}
        </div>
    );
}