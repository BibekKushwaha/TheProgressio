"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    selectIsAuthenticated,
    selectAuthStatus,
    useAppSelector,
} from "@repo/store";
import { PageLoader } from "@/components/layout/PageLoader";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard is a pure Redux fallback guard.
 *
 * Route protection happens at the request boundary in `middleware.ts`, where the
 * docs app verifies the current session with auth-service before protected
 * pages render. This component remains as the client-side fallback for cases
 * where a session becomes invalid after hydration, such as logout or a failed
 * refresh while the user is already inside the app.
 *
 * ### Mount-flash elimination
 * A module-level flag (`_hasMountedGlobally`) is set to true after the **first**
 * AuthGuard hydration and is never reset. Subsequent SPA route changes find the
 * flag already true via `useSyncExternalStore` and skip the PageLoader entirely,
 * eliminating the "Verifying session" flash on every navigation.
 */
// ---------------------------------------------------------------------------
// Module-level "has mounted" store — stays true for the lifetime of the tab.
// useSyncExternalStore reads it synchronously on each render so we never need
// to wait for a useEffect to flip it back to true during SPA navigation.
// ---------------------------------------------------------------------------
let _hasMountedGlobally = false;
const _mountedListeners = new Set<() => void>();

const _appMountedStore = {
    subscribe: (cb: () => void) => {
        _mountedListeners.add(cb);
        return () => _mountedListeners.delete(cb);
    },
    getSnapshot: () => _hasMountedGlobally,
    getServerSnapshot: () => false, // server always returns false (no localStorage)
};

function markMounted() {
    if (_hasMountedGlobally) return;
    _hasMountedGlobally = true;
    _mountedListeners.forEach((cb) => cb());
}

export function AuthGuard({ children }: AuthGuardProps) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const authStatus = useAppSelector(selectAuthStatus);
    const router = useRouter();
    const pathname = usePathname();

    // Read the global mount flag synchronously. On first load this is false
    // (same as SSR) preventing hydration mismatch. After markMounted() fires
    // it becomes true and stays true for all subsequent navigations.
    const isMounted = useSyncExternalStore(
        _appMountedStore.subscribe,
        _appMountedStore.getSnapshot,
        _appMountedStore.getServerSnapshot,
    );

    useEffect(() => {
        markMounted();
    }, []);

    useEffect(() => {
        if (!isMounted) return;
        if (!isAuthenticated && authStatus === 'unauthenticated') {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
    }, [isMounted, isAuthenticated, authStatus, router, pathname]);

    // Keep server markup and first client render identical to avoid hydration mismatch.
    if (!isMounted) {
        return (
            <PageLoader
                title="Verifying session"
                subtitle="Checking account and permissions..."
            />
        );
    }

    if (isAuthenticated) {
        return <>{children}</>;
    }

    if (authStatus === 'unauthenticated') {
        return (
            <PageLoader
                title="Redirecting to login"
                subtitle="Your session has expired or is unavailable."
            />
        );
    }

    return (
        <PageLoader
            title="Verifying session"
            subtitle="Checking account and permissions..."
        />
    );
}
