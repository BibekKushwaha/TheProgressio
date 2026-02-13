"use client"

import { RecoveryModePanel } from '@/components/planner/RecoveryModePanel'
import { LocalTask, Task, useGetTasksQuery, useLocalTasks } from '@repo/store';
import React, { useMemo } from 'react'


const toTimestamp = (value: string | Date | null | undefined): number => {
    if (!value) return Number.POSITIVE_INFINITY;
    return new Date(value).getTime();
};

const mergeTaskSources = (remoteTasks: Task[], localTasks: LocalTask[]): Task[] => {
    const merged = new Map<string, Task>();

    remoteTasks.forEach((task) => {
        merged.set(task.id, task);
    });

    localTasks.forEach((localTask) => {
        if (localTask._deletedLocally) {
            merged.delete(localTask.id);
            return;
        }

        if (localTask._dirty || localTask._localOnly || !merged.has(localTask.id)) {
            merged.set(localTask.id, localTask as unknown as Task);
        }
    });

    return Array.from(merged.values()).sort(
        (a, b) => toTimestamp(a.dueDate) - toTimestamp(b.dueDate)
    );
};
const PlannerPage = () => {
      const { data: allTasks } = useGetTasksQuery({ page: 1, limit: 500 });
  
  const { tasks: cachedTasks } = useLocalTasks();
      const tasks = useMemo(
          () => mergeTaskSources(allTasks || [], cachedTasks),
          [allTasks, cachedTasks]
      );
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white">
      <div className="flex-1 flex flex-col">
          <div className="px-4 md:px-8 pt-4">
               <RecoveryModePanel tasks={tasks} />
          </div>  
          </div>
      </div>
  )
}

export default PlannerPage

