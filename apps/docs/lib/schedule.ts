import { ScheduleItem } from '@repo/store';

export type MappedCalendarItem =
    | {
        kind: 'class';
        id: string;
        title: string;
        subject: string;
        startTime: string;
        endTime: string;
        room: string | null;
        color: string;
        rotation: string | null;
    }
    | {
        kind: 'task';
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        subtitle: string | null;
        category: string | null;
        color: string;
        isCompleted: boolean;
    }
    | {
        kind: 'exam';
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        location: string | null;
        subject: string | null;
        color: string;
    }
    | {
        kind: 'event';
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        subtitle: string | null;
        color: string;
    };

function normalizeTime(time: string | undefined | null): string {
    if (!time) return '00:00';
    const parts = time.split(':');
    if (parts.length >= 2) {
        const h = parseInt(parts[0] || '0', 10);
        const m = parseInt(parts[1] || '0', 10);
        if (!isNaN(h) && !isNaN(m)) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }
    return '00:00';
}

export function mapCalendarScheduleItem(item: ScheduleItem): MappedCalendarItem | null {
    if (!item || !item.type) return null;

    const base = {
        id: String(item.id),
        title: item.title || 'Untitled',
        startTime: normalizeTime(item.startTime),
        endTime: normalizeTime(item.endTime),
        color: item.color || 'blue',
    };

    switch (item.type) {
        case 'class':
            return {
                ...base,
                kind: 'class',
                subject: item.subject || 'Class',
                room: item.subtitle || null,
                rotation: item.rotation || null,
            };
        case 'task':
            return {
                ...base,
                kind: 'task',
                subtitle: item.subtitle || null,
                category: item.category || null,
                isCompleted: Boolean(item.isCompleted),
            };
        case 'exam':
            return {
                ...base,
                kind: 'exam',
                location: item.location || null,
                subject: item.subject || null,
                color: item.color || 'red', // Default to red for exams
            };
        case 'event':
            return {
                ...base,
                kind: 'event',
                subtitle: item.subtitle || null,
            };
        default:
            return null;
    }
}

export function mapCalendarScheduleItems(items: ScheduleItem[] | undefined | null): MappedCalendarItem[] {
    if (!Array.isArray(items)) return [];
    return items.map(mapCalendarScheduleItem).filter((item): item is MappedCalendarItem => item !== null);
}
