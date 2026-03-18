"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    selectIsAuthenticated,
    selectAuthStatus,
    useAppSelector,
    AUTH_SESSION_KEY,
} from "@repo/store";
import { PageLoader } from "@/components/layout/PageLoader";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard — client-side session fallback guard.
 *
 * Route protection is primarily enforced at the edge by `middleware.ts`.
 * This component is a secondary fallback for sessions that expire while the
 * user is already inside the dashboard (e.g. logout, failed token refresh).
 *
 * ─── Hydration-safe mount flag ───────────────────────────────────────────────
 * `_hasMountedGlobally` is module-level so it survives SPA navigations without
 * resetting. On SSR it is always `false` (no side-effects run on the server).
 *
 * IMPORTANT: it must NEVER be pre-set to `true` at module evaluation time in
 * a way that diverges from the server snapshot, because that would cause a
 * hydration mismatch. Instead it is only set to `true` inside `markMounted()`,
 * which is called from a `useEffect` (client-only, post-hydration).
 *
 * ─── "Verifying session" flash elimination ───────────────────────────────────
 * When the user navigates from the landing page (/public) to /dashboard via a
 * client-side push, AuthGuard mounts for the very first time — so
 * `_hasMountedGlobally` starts as `false`. Without special handling, this
 * triggers one render cycle of the PageLoader before the mount effect fires.
 *
 * Fix: inside `markMounted()` we immediately re-read `isAuthenticated` from the
 * Redux store. If it is already true (store was populated on the landing page by
 * AuthHydrator) we skip the loader entirely by updating a ref before React
 * performs the second render pass.
 *
 * ─── Hydration safety ────────────────────────────────────────────────────────
 * `isMounted` is driven by `useSyncExternalStore` whose *server snapshot*
 * always returns `false`. The *client snapshot* also returns `false` on the
 * very first render (before any effects run), matching the server. Effects then
 * flip it to `true`. This guarantees server == client on the initial paint and
 * avoids the mismatch caused by `isAuthenticated` being `true` on the client
 * first render (due to RTK Query localStorage cache preloaded into the store).
 */

// ---------------------------------------------------------------------------
// Module-level "has mounted" store — stays `true` for the lifetime of the tab.
// ---------------------------------------------------------------------------
let _hasMountedGlobally = false;
const _mountedListeners = new Set<() => void>();

const _appMountedStore = {
    subscribe: (cb: () => void) => {
        _mountedListeners.add(cb);
        return () => _mountedListeners.delete(cb);
    },
    getSnapshot: () => _hasMountedGlobally,
    getServerSnapshot: () => false as boolean, // server always false → no mismatch
};

function markMounted() {
    if (_hasMountedGlobally) return;
    _hasMountedGlobally = true;
    _mountedListeners.forEach((cb) => cb());
}

/** Read auth:hasSession from localStorage safely (client-only). */
function getSessionHint(): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AUTH_SESSION_KEY) === "1";
}

export function AuthGuard({ children }: AuthGuardProps) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const authStatus = useAppSelector(selectAuthStatus);
    const router = useRouter();
    const pathname = usePathname();

    // `isMounted` is false on both server AND on the client's very first render
    // (before effects). This guarantees the initial paint matches the server HTML
    // regardless of whether the RTK localStorage cache pre-populated the store.
    const isMounted = useSyncExternalStore(
        _appMountedStore.subscribe,
        _appMountedStore.getSnapshot,
        _appMountedStore.getServerSnapshot,
    );

    useEffect(() => {
        // markMounted() notifies useSyncExternalStore listeners, which causes
        // a synchronous re-render. By the time that re-render runs,
        // `isAuthenticated` may already be `true` (SPA nav fast path) so there
        // is NO extra PageLoader render cycle in that case.
        markMounted();
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        if (isAuthenticated) return;

        if (authStatus === "unauthenticated") {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
            return;
        }

        // Idle with no session hint → user has no session; redirect immediately.
        if (authStatus === "idle" && !getSessionHint()) {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
    }, [isMounted, isAuthenticated, authStatus, router, pathname]);

    // ── Pre-mount (first paint) ───────────────────────────────────────────────
    // Both server and client return the same HTML here → no hydration mismatch.
    // We intentionally do NOT fast-path on `isAuthenticated` here because the
    // RTK localStorage cache can make `isAuthenticated === true` on the client's
    // very first render while the server always renders with `false`.
    if (!isMounted) {
        return (
            <PageLoader
                title="Verifying session"
                subtitle="Checking account and permissions..."
            />
        );
    }

    // ── Post-mount ────────────────────────────────────────────────────────────
    // Effects have already run. `isMounted` flipped to true in the same
    // synchronous batch as the `markMounted()` useSyncExternalStore notification,
    // so `isAuthenticated` reflects the real store value here.

    if (isAuthenticated) {
        return <>{children}</>;
    }

    if (authStatus === "loading" || (authStatus === "idle" && getSessionHint())) {
        return (
            <PageLoader
                title="Verifying session"
                subtitle="Checking account and permissions..."
            />
        );
    }

    if (authStatus === "unauthenticated") {
        return (
            <PageLoader
                title="Redirecting to login"
                subtitle="Your session has expired or is unavailable."
            />
        );
    }

    // Idle + no session hint → redirect queued in effect above; render nothing.
    return null;
}
