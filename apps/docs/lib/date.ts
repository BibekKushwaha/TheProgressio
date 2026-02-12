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
