// Note: Habit data is now fetched via useGetHabitsQuery() from @repo/store.
// The HABITS mock array has been removed — use the API instead.

// ---------------------------------------------------------------------------
// Shared UI constants used across multiple pages
// ---------------------------------------------------------------------------

/** Interval (ms) at which background RTK Query polls run when the tab is hidden. */
export const POLLING_PAUSED = 0;

/** Interval (ms) at which notification nudges are polled when the tab is visible. */
export const NUDGE_POLL_INTERVAL_MS = 60_000;

/** localStorage key used to detect an existing auth session on page load. */
export const AUTH_SESSION_KEY = 'auth:hasSession';

/** Task priority labels in display order. */
export const PRIORITY_LABELS = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
} as const;

/** Task status labels in display order. */
export const STATUS_LABELS = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
} as const;

/** Default max-width class applied to page content areas. */
export const PAGE_MAX_WIDTH = 'max-w-7xl';
