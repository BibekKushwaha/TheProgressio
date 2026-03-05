import { Task } from '@repo/store';

type EffortOption = '30m' | '1h' | '2h' | '4h+';

export interface TaskFilterOptions {
    searchQuery: string;
    priority: string;
    category: string;
    status?: string;
    effort?: string;
    sort?: 'default' | 'quickWins';
}

/**
 * Shared task filtering logic used by both KanbanBoard and TaskList.
 * Filters tasks by search query, priority, category, and optionally status.
 */
export function filterTasks(taskList: Task[], filters: TaskFilterOptions): Task[] {
    const filtered = taskList.filter(task => {
        const searchLower = filters.searchQuery.toLowerCase();
        const matchesSearch = !filters.searchQuery ||
            task.title.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower);

        const matchesPriority = filters.priority === 'all' ||
            task.priority.toLowerCase() === filters.priority.toLowerCase();

        const normalizedFilterCategory = filters.category.toLowerCase();
        const taskCategoryName = task.category?.name?.toLowerCase() || '';
        const taskCategoryId = task.categoryId?.toLowerCase() || '';
        const matchesCategory = filters.category === 'all' ||
            taskCategoryName === normalizedFilterCategory ||
            taskCategoryId === normalizedFilterCategory;

        const matchesStatus = !filters.status || filters.status === 'all' ||
            task.status === filters.status;

        const matchesEffort = !filters.effort || filters.effort === 'all' ||
            task.effort === filters.effort;

        return matchesSearch && matchesPriority && matchesCategory && matchesStatus && matchesEffort;
    });

    if (filters.sort !== 'quickWins') return filtered;

    const effortRank: Record<EffortOption, number> = {
        '30m': 0,
        '1h': 1,
        '2h': 2,
        '4h+': 3,
    };

    return [...filtered].sort((a, b) => {
        const rankA = a.effort ? (effortRank[a.effort as EffortOption] ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        const rankB = b.effort ? (effortRank[b.effort as EffortOption] ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return a.title.localeCompare(b.title);
    });
}
