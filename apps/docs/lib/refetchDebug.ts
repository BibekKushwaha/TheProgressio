'use client';

export const REFETCH_DEBUG_STORAGE_KEY = 'debug:rtk-refetch-keys';

function readEnabledRefetchKeys(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    const raw = window.localStorage.getItem(REFETCH_DEBUG_STORAGE_KEY) ?? '';
    const keys = raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    return new Set(keys);
}

export function isRefetchDebugEnabled(key: string): boolean {
    const enabledKeys = readEnabledRefetchKeys();
    return enabledKeys.has('*') || enabledKeys.has(key);
}

export function getDebugRefetchOptions(key: string, pollingIntervalMs: number) {
    const enabled = isRefetchDebugEnabled(key);
    return {
        pollingInterval: enabled ? pollingIntervalMs : 0,
        refetchOnFocus: enabled,
        refetchOnReconnect: enabled,
    };
}

export function getDebugPollingOptions(key: string, pollingIntervalMs: number) {
    const enabled = isRefetchDebugEnabled(key);
    return {
        pollingInterval: enabled ? pollingIntervalMs : 0,
    };
}

export function getDebugMountRefetchOptions(key: string) {
    return {
        refetchOnMountOrArgChange: isRefetchDebugEnabled(key),
    };
}
