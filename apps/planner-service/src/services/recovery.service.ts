import { Priority, Status, prisma, type Task } from "@repo/db";

const PRIORITY_POINTS: Record<Priority, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
};

const DEFAULT_MAX_DAILY_LOAD = Number.parseInt(process.env.RECOVERY_MAX_DAILY_LOAD ?? "6", 10);
const DEFAULT_MAX_SHIFT_DAYS = Number.parseInt(process.env.RECOVERY_MAX_SHIFT_DAYS ?? "45", 10);

export interface RecoveryPlanItem {
    taskId: string;
    title: string;
    priority: Priority;
    oldDueDate: string;
    newDueDate: string;
    daysShifted: number;
    loadPoints: number;
}

export interface RecoveryPlan {
    createdAt: string;
    backlogCount: number;
    totalPriorityLoad: number;
    recoveryDays: number;
    maxDailyLoad: number;
    items: RecoveryPlanItem[];
}

const startOfDay = (value: Date): Date => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const addDays = (value: Date, days: number): Date => {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
};

const toIsoDate = (value: Date): string => value.toISOString();

const daysBetween = (left: Date, right: Date): number => {
    const ms = startOfDay(right).getTime() - startOfDay(left).getTime();
    return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
};

const buildDueDateForBucket = (bucketDate: Date, originalDueDate: Date): Date => {
    const next = new Date(bucketDate);
    next.setHours(
        originalDueDate.getHours(),
        originalDueDate.getMinutes(),
        originalDueDate.getSeconds(),
        originalDueDate.getMilliseconds(),
    );
    if (next.getHours() === 0 && next.getMinutes() === 0) {
        next.setHours(18, 0, 0, 0);
    }
    return next;
};

const sortByPriorityAndAge = (tasks: Task[]) =>
    [...tasks].sort((left, right) => {
        const byPriority = PRIORITY_POINTS[right.priority] - PRIORITY_POINTS[left.priority];
        if (byPriority !== 0) return byPriority;
        return (left.dueDate?.getTime() ?? 0) - (right.dueDate?.getTime() ?? 0);
    });

const normalizeRecoveryPlan = (items: RecoveryPlanItem[], maxDailyLoad: number): RecoveryPlan => {
    const totalPriorityLoad = items.reduce((sum, item) => sum + item.loadPoints, 0);
    const createdAt = new Date().toISOString();
    const recoveryDays = items.length === 0
        ? 0
        : daysBetween(new Date(createdAt), new Date(items[items.length - 1]!.newDueDate)) + 1;

    return {
        createdAt,
        backlogCount: items.length,
        totalPriorityLoad,
        recoveryDays,
        maxDailyLoad,
        items,
    };
};

export class RecoveryService {
    private readonly maxDailyLoad: number;
    private readonly maxShiftDays: number;

    constructor() {
        this.maxDailyLoad = Number.isFinite(DEFAULT_MAX_DAILY_LOAD) && DEFAULT_MAX_DAILY_LOAD > 0
            ? DEFAULT_MAX_DAILY_LOAD
            : 6;
        this.maxShiftDays = Number.isFinite(DEFAULT_MAX_SHIFT_DAYS) && DEFAULT_MAX_SHIFT_DAYS > 0
            ? DEFAULT_MAX_SHIFT_DAYS
            : 45;
    }

    async getOverdueTasks(userId: string, anchorDate = new Date()): Promise<Task[]> {
        const today = startOfDay(anchorDate);
        return prisma.task.findMany({
            where: {
                userId,
                status: { not: Status.COMPLETED },
                dueDate: { lt: today },
            },
            orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        });
    }

    createPlan(tasks: Task[], anchorDate = new Date()): RecoveryPlan {
        const today = startOfDay(anchorDate);
        const sorted = sortByPriorityAndAge(tasks);

        if (sorted.length === 0) {
            return normalizeRecoveryPlan([], this.maxDailyLoad);
        }

        let cursor = new Date(today);
        let loadBudget = this.maxDailyLoad;
        const items: RecoveryPlanItem[] = [];

        for (const task of sorted) {
            if (!task.dueDate) continue;
            const load = PRIORITY_POINTS[task.priority] ?? 1;

            if (load > loadBudget) {
                cursor = addDays(cursor, 1);
                loadBudget = this.maxDailyLoad;
            }

            const rawCandidate = buildDueDateForBucket(cursor, task.dueDate);
            const maxAllowedDate = addDays(today, this.maxShiftDays);
            const candidate = rawCandidate > maxAllowedDate ? maxAllowedDate : rawCandidate;
            // Safeguard: do not regress dates before today.
            const newDueDate = candidate < today ? today : candidate;

            items.push({
                taskId: task.id,
                title: task.title,
                priority: task.priority,
                oldDueDate: toIsoDate(task.dueDate),
                newDueDate: toIsoDate(newDueDate),
                daysShifted: daysBetween(task.dueDate, newDueDate),
                loadPoints: load,
            });

            loadBudget -= load;
            if (loadBudget <= 0) {
                cursor = addDays(cursor, 1);
                loadBudget = this.maxDailyLoad;
            }
        }

        return normalizeRecoveryPlan(items, this.maxDailyLoad);
    }

    async preview(userId: string, anchorDate = new Date()): Promise<RecoveryPlan> {
        const overdueTasks = await this.getOverdueTasks(userId, anchorDate);
        return this.createPlan(overdueTasks, anchorDate);
    }

    async apply(userId: string, anchorDate = new Date(), taskIds?: string[], overrides?: Record<string, string>) {
        const plan = await this.preview(userId, anchorDate);
        if (plan.items.length === 0) {
            return { plan, updatedCount: 0 };
        }

        // Filter by taskIds if provided
        let itemsToUpdate = plan.items;
        if (taskIds && taskIds.length > 0) {
            itemsToUpdate = itemsToUpdate.filter(item => taskIds.includes(item.taskId));
        }

        if (itemsToUpdate.length === 0) {
            return { plan, updatedCount: 0 };
        }

        await prisma.$transaction(
            itemsToUpdate.map((item) => {
                const overrideDate = overrides?.[item.taskId];
                const finalDate = overrideDate
                    ? new Date(overrideDate)
                    : new Date(item.newDueDate);

                return prisma.task.updateMany({
                    where: {
                        id: item.taskId,
                        userId,
                        status: { not: Status.COMPLETED },
                    },
                    data: { dueDate: finalDate },
                });
            }),
        );

        return {
            plan,
            updatedCount: itemsToUpdate.length,
        };
    }
}

export const recoveryService = new RecoveryService();
