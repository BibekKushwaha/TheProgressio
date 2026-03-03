'use client';

/**
 * useStreamingMemoryProfile
 *
 * DEV-ONLY hook that samples `performance.memory` (Chrome / Edge / Chromium-
 * based browsers) while a streaming Suspense boundary is in-flight and logs a
 * table when the boundary resolves.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  In production the hook is a no-op — zero runtime overhead.      │
 * │  In development it samples every SAMPLE_INTERVAL_MS and emits    │
 * │  a console.table once `isStreaming` flips false.                  │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *
 *   // true while awaiting the server-streamed Promise; false once resolved
 *   useStreamingMemoryProfile('HabitsDashboard', isSecondaryLoading);
 *
 * The hook logs three memory metrics (when available):
 *   usedJSHeapSize    — active JS objects (bytes)
 *   totalJSHeapSize   — committed heap (bytes)
 *   jsHeapSizeLimit   — maximum allocatable heap (bytes)
 *
 * Note: `performance.memory` is a non-standard Chromium API that returns
 * coarsened values in cross-origin isolated contexts.  Never use these numbers
 * for production alerting; use them for comparative local profiling only.
 */

import { useEffect, useRef } from 'react';

const SAMPLE_INTERVAL_MS = 250;

interface MemorySample {
    t:              number; // ms from start
    usedJSHeap:     number; // bytes
    totalJSHeap:    number; // bytes
    heapSizeLimit:  number; // bytes
}

type PerformanceWithMemory = Performance & {
    memory?: {
        usedJSHeapSize:  number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
    };
};

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k    = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i    = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function useStreamingMemoryProfile(
    label:       string,
    isStreaming:  boolean,
): void {
    // No-op outside dev or in environments that have stripped the hook at
    // build time (tree-shaken by Webpack when process.env.NODE_ENV !== 'development')
    if (process.env.NODE_ENV !== 'development') return;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const samplesRef    = useRef<MemorySample[]>([]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const startTimeRef  = useRef<number | null>(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        const perf = performance as PerformanceWithMemory;

        if (!perf?.memory) {
            // Non-Chromium browser or memory API not available
            if (isStreaming) {
                console.debug(
                    `[MemProfile:${label}] performance.memory unavailable — ` +
                    'use Chrome / Edge for heap sampling.'
                );
            }
            return;
        }

        if (isStreaming) {
            // ── Streaming started — begin sampling ─────────────────────────
            samplesRef.current   = [];
            startTimeRef.current = performance.now();

            intervalRef.current = setInterval(() => {
                const mem = perf.memory!;
                samplesRef.current.push({
                    t:             Math.round(performance.now() - (startTimeRef.current ?? 0)),
                    usedJSHeap:    mem.usedJSHeapSize,
                    totalJSHeap:   mem.totalJSHeapSize,
                    heapSizeLimit: mem.jsHeapSizeLimit,
                });
            }, SAMPLE_INTERVAL_MS);
        } else if (intervalRef.current !== null) {
            // ── Streaming resolved — stop sampling and log table ───────────
            clearInterval(intervalRef.current);
            intervalRef.current = null;

            const samples = samplesRef.current;
            if (samples.length === 0) return;

            // Compute per-sample delta and delta-peak
            const first = samples[0]!;
            const last  = samples[samples.length - 1]!;
            const peak  = Math.max(...samples.map((s) => s.usedJSHeap));

            const duration = last.t;
            const growth   = last.usedJSHeap - first.usedJSHeap;

            console.groupCollapsed(
                `%c[MemProfile:${label}] Streaming complete — ${duration} ms | ` +
                `heap growth: ${formatBytes(growth)} | peak: ${formatBytes(peak)}`,
                'color: #7c3aed; font-weight: bold;'
            );

            console.table(
                samples
                    // Down-sample to at most 20 rows so the table is readable
                    .filter((_, i) => i % Math.max(1, Math.floor(samples.length / 20)) === 0)
                    .map((s) => ({
                        't (ms)':         s.t,
                        'usedJSHeap':     formatBytes(s.usedJSHeap),
                        'totalJSHeap':    formatBytes(s.totalJSHeap),
                        'heapSizeLimit':  formatBytes(s.heapSizeLimit),
                    }))
            );

            console.log(
                `Summary | first: ${formatBytes(first.usedJSHeap)}, ` +
                `last: ${formatBytes(last.usedJSHeap)}, ` +
                `growth: ${formatBytes(growth)}, peak: ${formatBytes(peak)}`
            );
            console.groupEnd();
        }

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isStreaming]);
}
