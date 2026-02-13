import { PriorityEnum, Task, TaskStatus } from '@repo/store';

const DAY_POINTS_CAPACITY = 4;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PRIORITY_POINTS: Record<PriorityEnum, number> = {
    [PriorityEnum.HIGH]: 3,
    [PriorityEnum.MEDIUM]: 2,
    [PriorityEnum.LOW]: 1,
};

export interface RecoveryPlanItem {
    taskId: string;
    title: string;
    priority: PriorityEnum;
    oldDueDate: string;
    newDueDate: string;
    daysShifted: number;
}

export interface RecoveryPlan {
    createdAt: string;
    backlogCount: number;
    totalPriorityLoad: number;
    recoveryDays: number;
    items: RecoveryPlanItem[];
}

const startOfDay = (date: Date): Date => {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
};

const shiftDays = (date: Date, amount: number): Date => {
    const value = new Date(date);
    value.setDate(value.getDate() + amount);
    return value;
};

const buildDueDateForDay = (day: Date, originalDueDate: string): string => {
    const value = new Date(day);
    const original = new Date(originalDueDate);
    if (!Number.isNaN(original.getTime())) {
        value.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), 0);
    } else {
        value.setHours(18, 0, 0, 0);
    }
    return value.toISOString();
};

const getDaysBetween = (from: Date, to: Date): number => {
    return Math.max(0, Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY));
};

export function buildRecoveryPlan(tasks: Task[], anchorDate: Date = new Date()): RecoveryPlan {
    const today = startOfDay(anchorDate);
    const overdueTasks = tasks
        .filter((task) => {
            if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
            const due = new Date(task.dueDate);
            if (Number.isNaN(due.getTime())) return false;
            return due < today;
        })
        .sort((left, right) => {
            const byPriority = (PRIORITY_POINTS[right.priority] ?? 0) - (PRIORITY_POINTS[left.priority] ?? 0);
            if (byPriority !== 0) return byPriority;
            return new Date(left.dueDate as string).getTime() - new Date(right.dueDate as string).getTime();
        });

    if (overdueTasks.length === 0) {
        return {
            createdAt: new Date().toISOString(),
            backlogCount: 0,
            totalPriorityLoad: 0,
            recoveryDays: 0,
            items: [],
        };
    }

    let cursor = new Date(today);
    let pointsLeftToday = DAY_POINTS_CAPACITY;

    const items: RecoveryPlanItem[] = overdueTasks.map((task) => {
        const effortPoints = PRIORITY_POINTS[task.priority] ?? 1;
        if (effortPoints > pointsLeftToday) {
            cursor = shiftDays(cursor, 1);
            pointsLeftToday = DAY_POINTS_CAPACITY;
        }

        const newDueDate = buildDueDateForDay(cursor, task.dueDate as string);
        pointsLeftToday -= effortPoints;

        return {
            taskId: task.id,
            title: task.title,
            priority: task.priority,
            oldDueDate: task.dueDate as string,
            newDueDate,
            daysShifted: getDaysBetween(new Date(task.dueDate as string), new Date(newDueDate)),
        };
    });

    const totalPriorityLoad = overdueTasks.reduce(
        (sum, task) => sum + (PRIORITY_POINTS[task.priority] ?? 1),
        0
    );
    const recoveryDays = getDaysBetween(today, new Date(items[items.length - 1]!.newDueDate)) + 1;

    return {
        createdAt: new Date().toISOString(),
        backlogCount: overdueTasks.length,
        totalPriorityLoad,
        recoveryDays,
        items,
    };
}
