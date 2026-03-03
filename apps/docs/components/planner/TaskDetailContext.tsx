// components/planner/TaskDetailContext.tsx
'use client';

import { createContext, useContext } from 'react';
import { type Task, useGetTaskByIdQuery } from '@repo/store';
import { useTaskRouteId } from '@/hooks/useTaskRouteId';

interface TaskDetailContextValue {
    task: Task | undefined;
    isLoading: boolean;
    taskId: string;
}

const TaskDetailContext = createContext<TaskDetailContextValue>({
    task: undefined,
    isLoading: true,
    taskId: '',
});

/**
 * Fetches the task for the current route once and provides it to all
 * children. Replaces 4+ independent useGetTaskByIdQuery subscriptions
 * with a single subscription — reducing re-renders on task cache updates.
 */
export function TaskDetailProvider({ children }: { children: React.ReactNode }) {
    const taskId = useTaskRouteId();
    const { data: task, isLoading } = useGetTaskByIdQuery(taskId || '', { skip: !taskId });

    return (
        <TaskDetailContext.Provider value={{ task, isLoading, taskId: taskId || '' }}>
            {children}
        </TaskDetailContext.Provider>
    );
}

export function useTaskDetail(): TaskDetailContextValue {
    return useContext(TaskDetailContext);
}
