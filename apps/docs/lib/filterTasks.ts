import { Task } from '@repo/store';

export interface TaskFilterOptions {
    searchQuery: string;
    priority: string;
    category: string;
    status?: string;
}

/**
 * Shared task filtering logic used by both KanbanBoard and TaskList.
 * Filters tasks by search query, priority, category, and optionally status.
 */
export function filterTasks(taskList: Task[], filters: TaskFilterOptions): Task[] {
    return taskList.filter(task => {
        const searchLower = filters.searchQuery.toLowerCase();
        const matchesSearch = !filters.searchQuery ||
            task.title.toLowerCase().includes(searchLower);

        const matchesPriority = filters.priority === 'all' ||
            task.priority.toLowerCase() === filters.priority.toLowerCase();

        const taskCategoryName = task.category?.name || 'No Category';
        const matchesCategory = filters.category === 'all' ||
            taskCategoryName.toLowerCase() === filters.category.toLowerCase();

        const matchesStatus = !filters.status || filters.status === 'all' ||
            task.status === filters.status;

        return matchesSearch && matchesPriority && matchesCategory && matchesStatus;
    });
}
