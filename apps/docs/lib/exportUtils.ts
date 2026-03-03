import { Task } from '@repo/store';

export function exportTasksToCSV(tasks: Task[]): string {
    const headers = [
        'ID',
        'Title',
        'Status',
        'Priority',
        'Due Date',
        'Category Name',
        'Recurring',
        'Subtasks (Completed/Total)'
    ];

    const rows = tasks.map(task => {
        const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
        const totalSubtasks = task.subtasks?.length || 0;

        // Escape quotes and handle commas in strings by wrapping in double quotes
        const escapeString = (str: string | undefined | null) => {
            if (!str) return '""';
            return `"${str.replace(/"/g, '""')}"`;
        };

        return [
            escapeString(task.id),
            escapeString(task.title),
            escapeString(task.status),
            escapeString(task.priority),
            task.dueDate ? escapeString(new Date(task.dueDate).toLocaleString()) : '""',
            escapeString(task.category?.name),
            task.isRecurring ? '"Yes"' : '"No"',
            `"${completedSubtasks}/${totalSubtasks}"`
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(csvContent: string, filename: string) {
    if (typeof document === 'undefined') return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
