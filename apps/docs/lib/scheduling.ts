export function toApparentUtcIso(date: Date): string {
    const apparent = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return apparent.toISOString();
}

function isValidDateKey(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTimeKey(value: string): boolean {
    return /^\d{2}:\d{2}$/.test(value);
}

export function buildScheduledIso(
    nextDate: string,
    nextTime: string,
    options?: {
        defaultDateToToday?: boolean;
        defaultTime?: string;
        requireExplicitDate?: boolean;
    }
): string | null {
    const trimmedDate = nextDate.trim();
    const trimmedTime = nextTime.trim();

    if (!trimmedDate && !trimmedTime) return null;
    if (options?.requireExplicitDate && !trimmedDate) return null;

    const safeDate = trimmedDate || (options?.defaultDateToToday ? new Date().toISOString().slice(0, 10) : '');
    const safeTime = trimmedTime || options?.defaultTime || '00:00';

    if (!safeDate || !isValidDateKey(safeDate) || !isValidTimeKey(safeTime)) return null;

    const localDate = new Date(`${safeDate}T${safeTime}`);
    if (Number.isNaN(localDate.getTime())) return null;

    return toApparentUtcIso(localDate);
}
