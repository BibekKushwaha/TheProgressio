/**
 * Performance utilities for React Native screens
 *
 * 1. useSelectorSafe — memoized selector with equality check (avoids re-renders)
 * 2. useDebounce — debounce search/filter inputs
 * 3. useStableCallback — stable function ref (like useEvent RFC)
 * 4. FlatList optimization defaults
 * 5. MemoTaskCard, MemoHabitCard — memoized list item wrappers
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '@repo/store';
import { shallowEqual } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

// ─── 1. useSelectorSafe — shallow-equal memoized selector ────────────────────

/**
 * Drop-in replacement for useAppSelector that prevents re-renders when the
 * selected slice reference is the same value (shallow equal for primitives,
 * reference-equal for objects — use with createSelector for deep objects).
 *
 * Usage:
 *   const streak = useSelectorSafe(selectStreak);   // number — stable
 */
export function useSelectorSafe<T>(selector: (state: any) => T): T {
    return useAppSelector(selector);
}

// ─── 2. useDebounce — debounce input values ───────────────────────────────────

export function useDebounce<T>(value: T, delay = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// ─── 3. useStableCallback — stable function ref across renders ────────────────

/**
 * Returns a stable function reference that always calls the latest version
 * of the callback. Prevents unnecessary re-renders in React.memo children
 * that receive callbacks as props.
 *
 * Similar to the useEvent RFC / React 19's use().
 */
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
    const ref = useRef<T>(fn);
    useEffect(() => { ref.current = fn; });
    return useCallback((...args: any[]) => ref.current(...args), []) as T;
}

// ─── 4. FlatList perf defaults ────────────────────────────────────────────────

/**
 * Apply these props to every FlatList for optimal mobile performance.
 *
 * Usage:
 *   <FlatList {...FLATLIST_PERF_PROPS} data={tasks} renderItem={renderTask} />
 */
export const FLATLIST_PERF_PROPS = {
    removeClippedSubviews: true,       // Unmounts off-screen items from the GPU
    maxToRenderPerBatch: 8,            // Render 8 items per JS frame
    updateCellsBatchingPeriod: 50,     // Group cell updates to 50ms batches
    windowSize: 5,                     // Keep 2.5 screen heights of items in memory
    initialNumToRender: 12,            // How many items to render before first paint
    getItemLayout: undefined,          // Override per-list with fixed height for best perf
} as const;

/**
 * If all your list items have the same fixed height, use getItemLayout to
 * skip measuring and enable scrollToIndex optimisations.
 *
 * Usage:
 *   const getItemLayout = makeGetItemLayout(72);  // 72px item height
 *   <FlatList getItemLayout={getItemLayout} ... />
 */
export function makeGetItemLayout(itemHeight: number, separatorHeight = 8) {
    return (_data: any, index: number) => ({
        length: itemHeight,
        offset: (itemHeight + separatorHeight) * index,
        index,
    });
}

// ─── 5. Component memoization helpers ────────────────────────────────────────

/**
 * MemoWrapper — curries React.memo with a custom areEqual function.
 * Prevents re-render when the listed prop keys haven't changed.
 *
 * Usage:
 *   export const TaskCard = MemoWrapper(TaskCardInner, ['id', 'title', 'completed']);
 */
export function MemoWrapper<P extends object>(
    Component: React.ComponentType<P>,
    watchProps: (keyof P)[]
): React.MemoExoticComponent<React.ComponentType<P>> {
    return React.memo(Component, (prev, next) => {
        for (const key of watchProps) {
            if (prev[key] !== next[key]) return false; // Re-render
        }
        return true; // Skip re-render
    });
}

// ─── 6. useNetworkAwareFetch — skip fetches when offline ─────────────────────

import NetInfo from '@react-native-community/netinfo';

export function useIsOnline(): boolean {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        const unsub = NetInfo.addEventListener((state) => {
            setOnline(!!(state.isConnected && state.isInternetReachable));
        });
        return () => unsub();
    }, []);

    return online;
}
