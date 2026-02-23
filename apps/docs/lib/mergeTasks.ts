import type { LocalTask, Task } from '@repo/store';

/**
 * Converts a nullable date-like value to a numeric timestamp for sorting.
 * Tasks without a due date sort to the end (positive infinity).
 */
export const toTimestamp = (value: string | Date | null | undefined): number => {
    if (!value) return Number.POSITIVE_INFINITY;
    return new Date(value).getTime();
};

/**
 * Merges remote tasks from the server with locally-cached/offline tasks.
 * Local tasks that are dirty or local-only override the remote copy.
 * Local tasks marked as deleted are removed from the merged set.
 * The result is sorted ascending by due date (null/undefined → end).
 */
export const mergeTaskSources = (remoteTasks: Task[], localTasks: LocalTask[]): Task[] => {
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
