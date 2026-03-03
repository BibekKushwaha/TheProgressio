/**
 * useNetworkWaterfall
 *
 * DEV-ONLY. No-ops in production (dead-code eliminated by bundler).
 *
 * Attaches a PerformanceObserver on mount, collects every fetch/xhr resource
 * entry that starts within the mount window, then logs a formatted table to
 * the console on unmount (or after a 5 s drain window if the component stays
 * mounted).
 *
 * Usage:
 *   useNetworkWaterfall('HabitsPage');
 *
 * Console output (DevTools → Console):
 *   [Waterfall] HabitsPage (5 requests, 312 ms total)
 *   ┌──────────────────────────────┬──────────┬───────────┬─────────────┬──────────┐
 *   │ endpoint                     │ type     │ start(ms) │ dur(ms)     │ size(kb) │
 *   ├──────────────────────────────┼──────────┼───────────┼─────────────┼──────────┤
 *   │ habits/api/habits/           │ fetch    │ 12        │ 180         │ 4        │
 *   │ habits/api/habits/xp         │ fetch    │ 14        │ 210         │ 1        │
 *   │ habits/api/habits/heatmap    │ fetch    │ 15        │ 312         │ 22       │
 *   └──────────────────────────────┴──────────┴───────────┴─────────────┴──────────┘
 */

import { useEffect } from 'react';

const IS_DEV = process.env.NODE_ENV === 'development';

// Only API fetch/xhr entries — filter out static assets, fonts, scripts.
const TRACKED_TYPES = new Set(['fetch', 'xmlhttprequest']);

// Drain window: collect entries that arrive up to 5 s after mount before
// logging. Covers lazy queries and slow connections in dev.
const DRAIN_MS = 5_000;

interface WaterfallRow {
    endpoint: string;
    type: string;
    'start(ms)': number;
    'dur(ms)': number;
    'size(kb)': number | '–';
    cached: boolean;
}

export function useNetworkWaterfall(label: string): void {
    useEffect(() => {
        if (!IS_DEV) return;
        if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

        const mountTime = performance.now();
        performance.mark(`${label}:mount`);

        const collected: PerformanceResourceTiming[] = [];

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
                if (
                    TRACKED_TYPES.has(entry.initiatorType) &&
                    entry.startTime >= mountTime
                ) {
                    collected.push(entry);
                }
            }
        });

        observer.observe({ type: 'resource', buffered: true });

        // Drain timer — log after DRAIN_MS whether or not the component unmounts.
        let logged = false;
        const log = () => {
            if (logged) return;
            logged = true;
            observer.disconnect();
            performance.mark(`${label}:waterfall-end`);

            if (collected.length === 0) {
                console.debug(`%c[Waterfall] ${label}: no API requests observed (all cached or not yet fired)`, 'color:#6b7280');
                return;
            }

            const baseTime = collected[0]!.startTime;
            const totalDur = Math.round(
                Math.max(...collected.map((e) => e.startTime + e.duration)) - baseTime
            );

            const rows: WaterfallRow[] = collected
                .sort((a, b) => a.startTime - b.startTime)
                .map((e) => ({
                    endpoint: e.name
                        .replace(/^https?:\/\/[^/]+/, '')   // strip origin
                        .replace(/\?.*$/, '')                // strip query string
                        .slice(-50),                         // max 50 chars from right
                    type: e.initiatorType,
                    'start(ms)': Math.round(e.startTime - mountTime),
                    'dur(ms)': Math.round(e.duration),
                    'size(kb)': e.transferSize > 0 ? Math.round(e.transferSize / 1024) : '–',
                    cached: e.transferSize === 0 && e.duration < 5,
                }));

            console.group(
                `%c[Waterfall] ${label}`,
                'color:#7c3aed;font-weight:bold',
                `— ${collected.length} requests, ~${totalDur} ms total`
            );
            console.table(rows);
            console.groupEnd();
        };

        const drainTimer = window.setTimeout(log, DRAIN_MS);

        return () => {
            window.clearTimeout(drainTimer);
            log();
        };
        // label is intentionally excluded — it's a static debug name, not reactive data.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
