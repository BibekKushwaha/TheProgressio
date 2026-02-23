import { TaskStatus } from '@repo/store';

const INVALID_TASK_ID_TOKENS = new Set(['', 'undefined', 'null']);

export function sanitizeTaskId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    if (INVALID_TASK_ID_TOKENS.has(id)) return null;
    return id;
}

export function extractTaskId(task: unknown): string | null {
    if (!task || typeof task !== 'object') return null;
    const t = task as Record<string, unknown>;
    return (
        sanitizeTaskId(t.id) ??
        sanitizeTaskId(t.taskId) ??
        sanitizeTaskId(t._id) ??
        sanitizeTaskId((t.task as Record<string, unknown> | undefined)?.id)
    );
}

export function normalizeTaskStatus(task: unknown): TaskStatus {
    if (!task || typeof task !== 'object') return TaskStatus.PENDING;
    const t = task as Record<string, unknown>;
    const status = t.status;

    if (status === TaskStatus.PENDING || status === TaskStatus.IN_PROGRESS || status === TaskStatus.COMPLETED) {
        return status;
    }

    if (t.completed === true) {
        return TaskStatus.COMPLETED;
    }

    return TaskStatus.PENDING;
}

export function isTaskCompleted(task: unknown): boolean {
    return normalizeTaskStatus(task) === TaskStatus.COMPLETED;
}

export function getTaskSubtasks(task: unknown): Array<{ id: string; title: string; completed: boolean; taskId?: string }> {
    if (!task || typeof task !== 'object') return [];
    const t = task as Record<string, unknown>;
    const subtasks = Array.isArray(t.subtasks) ? t.subtasks : Array.isArray(t.subTasks) ? t.subTasks : [];
    return subtasks as Array<{ id: string; title: string; completed: boolean; taskId?: string }>;
}

export function formatTaskStatusLabel(status: TaskStatus): string {
    return status.replace('_', ' ');
}
