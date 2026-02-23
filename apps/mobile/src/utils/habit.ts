import { Colors } from '../theme';

const GRADIENT_COLOR_MAP: Record<string, string> = {
    purple: '#9333EA',
    blue: '#2563EB',
    green: '#16A34A',
    orange: '#EA580C',
    red: '#DC2626',
    indigo: '#4F46E5',
};

export const HABIT_COLOR_PRESETS = Object.values(GRADIENT_COLOR_MAP);

export function normalizeHabitColor(raw?: string): string {
    if (!raw) return Colors.primary;
    if (raw.startsWith('#') || raw.startsWith('rgb')) return raw;
    const m = raw.match(/from-([a-z]+)-\d+/i);
    const key = m?.[1]?.toLowerCase() ?? '';
    return GRADIENT_COLOR_MAP[key] ?? Colors.primary;
}

export function isHabitLogCompleted(log: any): boolean {
    return Number(log?.completedValue ?? (log?.completed ? 1 : 0)) > 0;
}

export function toDateKey(value: any): string {
    return String(value ?? '').slice(0, 10);
}

export function isHabitDoneOnDate(logs: any[], dateKey: string): boolean {
    return logs.some((log) => toDateKey(log?.loggedAt ?? log?.date) === dateKey && isHabitLogCompleted(log));
}
