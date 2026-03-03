import type { Nudge } from '@repo/store';
import type { ReactNode } from 'react';

// ─── Constants ─────────────────────────────────────────────────────────────

/** Module-level constant — no per-render reconstruction. */
export const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SNOOZE_OPTIONS = [
    { label: '30m', value: 30 },
    { label: '2h', value: 120 },
    { label: '1d', value: 1440 },
] as const;

// ─── Metadata parsing ───────────────────────────────────────────────────────

export function parseNudgeMetadata(
    metadata: Nudge['metadata']
): Record<string, unknown> {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
        try {
            const parsed = JSON.parse(metadata) as unknown;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
            return parsed as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    if (typeof metadata === 'object' && !Array.isArray(metadata)) {
        return metadata as Record<string, unknown>;
    }
    return {};
}

// ─── Progress extraction ────────────────────────────────────────────────────

export interface ProgressInfo {
    current: number;
    total: number;
    label?: string;
}

export function extractProgress(
    metadata: Record<string, unknown>
): ProgressInfo | null {
    const anatomy = metadata.anatomy;
    if (!anatomy || typeof anatomy !== 'object' || Array.isArray(anatomy)) return null;
    const progress = (anatomy as Record<string, unknown>).progress;
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) return null;

    const current = Number((progress as Record<string, unknown>).current ?? 0);
    const total = Number((progress as Record<string, unknown>).total ?? 0);
    const label = (progress as Record<string, unknown>).label;

    if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;
    return { current, total, label: typeof label === 'string' ? label : undefined };
}

// ─── Rich media extraction ──────────────────────────────────────────────────

export interface RichMediaInfo {
    url: string;
    type: string;
}

export function extractRichMedia(
    metadata: Record<string, unknown>
): RichMediaInfo | null {
    const anatomy = metadata.anatomy;
    if (!anatomy || typeof anatomy !== 'object' || Array.isArray(anatomy)) return null;
    const richMedia = (anatomy as Record<string, unknown>).richMedia;
    if (!richMedia || typeof richMedia !== 'object' || Array.isArray(richMedia)) return null;

    const url = (richMedia as Record<string, unknown>).url;
    const type = (richMedia as Record<string, unknown>).type;
    if (typeof url !== 'string' || !url) return null;
    return { url, type: typeof type === 'string' ? type : '' };
}

// ─── Deep link resolution ───────────────────────────────────────────────────

/** Resolves a metadata block to an internal or external deep link. */
export function resolveNudgeDeepLink(metadata: Record<string, unknown>): string {
    const taskIdLink = typeof metadata.taskId === 'string' ? metadata.taskId : undefined;
    const habitIdLink = typeof metadata.habitId === 'string' ? metadata.habitId : undefined;
    const metadataDeepLink =
        typeof metadata.deepLink === 'string' ? metadata.deepLink.trim() : '';

    if (taskIdLink) return `/tasks?taskId=${encodeURIComponent(taskIdLink)}`;
    if (habitIdLink) return `/habits?habitId=${encodeURIComponent(habitIdLink)}`;
    if (!metadataDeepLink) return '/dashboard';
    if (/^(https?:)?\/\//i.test(metadataDeepLink)) return metadataDeepLink;
    return metadataDeepLink.startsWith('/') ? metadataDeepLink : `/${metadataDeepLink}`;
}

/**
 * Navigates to a deep link, blocking off-origin external URLs.
 * Returns the resolved path for same-origin links, or calls window.location.assign
 * for allowed external URLs.
 */
export function navigateDeepLink(
    deepLink: string,
    push: (href: string) => void
): void {
    try {
        if (/^(https?:)?\/\//i.test(deepLink)) {
            const parsed = new URL(deepLink, window.location.origin);
            if (parsed.origin !== window.location.origin) {
                // Block off-origin navigation silently
                console.warn('Blocked external deep link:', parsed.href);
                return;
            }
            push(`${parsed.pathname}${parsed.search}${parsed.hash}`);
            return;
        }
        push(deepLink.startsWith('/') ? deepLink : `/${deepLink}`);
    } catch {
        window.location.assign(deepLink);
    }
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatScheduledAt(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
}

// ─── Styling maps ───────────────────────────────────────────────────────────

export const PRIORITY_CLASS: Record<string, string> = {
    high: 'border-red-500/30 bg-red-500/10',
    medium: 'border-yellow-500/30 bg-yellow-500/10',
    low: 'border-blue-500/30 bg-blue-500/10',
};

export function getPriorityClass(priority: string): string {
    return PRIORITY_CLASS[(priority || '').toLowerCase()] ?? 'border-white/10 bg-white/5';
}

// Note: icon components are created in NudgeCard to keep React imports out of
// a plain utility file. Map the type → icon name; NudgeCard resolves the JSX.
export type NudgeIconType =
    | 'streak_reminder'
    | 'achievement'
    | 'suggestion'
    | 'urgency_driven'
    | 'digest_summary'
    | 'default';

export function getNudgeIconType(type: string): NudgeIconType {
    const t = (type || '').toLowerCase() as NudgeIconType;
    const known: NudgeIconType[] = [
        'streak_reminder', 'achievement', 'suggestion', 'urgency_driven', 'digest_summary',
    ];
    return known.includes(t) ? t : 'default';
}

// ─── Action extraction ──────────────────────────────────────────────────────

export interface NudgeAction {
    id: string;
    label: string;
    actionType: string;
}

export function extractActions(metadata: Record<string, unknown>): NudgeAction[] {
    const actionsRaw = Array.isArray(metadata.actions) ? metadata.actions : [];
    return actionsRaw
        .filter((item): item is NudgeAction => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
            const cast = item as Record<string, unknown>;
            return (
                typeof cast.id === 'string' &&
                typeof cast.label === 'string' &&
                typeof cast.actionType === 'string'
            );
        })
        .slice(0, 3);
}

// Suppress unused import warning — ReactNode may be needed by consumers
export type { ReactNode };
