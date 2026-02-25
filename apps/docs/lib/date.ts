export function toLocalDateKey(value: Date): string {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
    const offsetMs = value.getTimezoneOffset() * 60 * 1000;
    return new Date(value.getTime() - offsetMs).toISOString().split('T')[0] || '';
}

export function getTodayDateKey(): string {
    return toLocalDateKey(new Date());
}

export function normalizeDateInput(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!slashMatch) return null;

    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    if (!Number.isFinite(first) || !Number.isFinite(second) || !Number.isFinite(year)) {
        return null;
    }

    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatRelativeDate(dateInput: Date | string): string {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    if (diffDays > 1 && diffDays < 7) {
        return targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    }

    if (diffDays >= 7 && diffDays < 14) {
        return `Next ${targetDate.toLocaleDateString('en-US', { weekday: 'long' })}`;
    }

    return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Returns a human-readable relative due-date label for a task.
 * e.g. "Due today", "Due tomorrow", "3d left", "2d overdue", "Jan 5"
 */
export function formatDueDate(dueDate?: string | null): string {
    if (!dueDate) return 'No due date';
    const date = new Date(dueDate);
    const now = new Date();

    // Normalize to start of day for accurate day difference
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d2 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `${diffDays}d left`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
