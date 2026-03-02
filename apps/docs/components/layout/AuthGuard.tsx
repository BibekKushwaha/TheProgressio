"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    selectIsAuthenticated,
    selectAuthStatus,
    useAppSelector,
} from "@repo/store";
import { AUTH_SESSION_KEY } from "@/constant";
import { PageLoader } from "@/components/layout/PageLoader";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard is a **pure Redux consumer** — it never fires a network request.
 *
 * Responsibilities:
 * 1. Read `auth.status` set by AuthHydrator (StoreProvider) to decide
 *    whether to render children, show a loader, or redirect.
 * 2. Redirect immediately when `auth:hasSession` is absent in localStorage
 *    so we bypass the AuthHydrator cycle entirely for unauthenticated users.
 *
 * The previous implementation fired its own `useGetProfileQuery`, causing a
 * duplicate `GET /profile` alongside AuthHydrator on every first dashboard
 * load. Removing the fetch here eliminates that race condition.
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const authStatus = useAppSelector(selectAuthStatus);
    const router = useRouter();
    const pathname = usePathname();

    // Defer localStorage read to the client to avoid SSR mismatch.
    const [sessionChecked, setSessionChecked] = useState(false);
    const [hasSessionHint, setHasSessionHint] = useState(false);

    useEffect(() => {
        const hint = localStorage.getItem(AUTH_SESSION_KEY) === '1';
        setHasSessionHint(hint);
        setSessionChecked(true);
    }, []);

    useEffect(() => {
        if (!sessionChecked) return;
        if (isAuthenticated) return;

        // No local session flag — redirect without waiting for a network round-trip.
        if (!hasSessionHint) {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
            return;
        }

        // Had a session flag but the profile fetch returned 401/404 — token expired.
        if (authStatus === 'unauthenticated') {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
    }, [sessionChecked, hasSessionHint, isAuthenticated, authStatus, router, pathname]);

    // First paint — localStorage not yet read.
    if (!sessionChecked) {
        return (
            <PageLoader
                title="Verifying session"
                subtitle="Checking account and permissions..."
            />
        );
    }

    // Already confirmed by AuthHydrator — render immediately.
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // No session hint or explicitly unauthenticated — redirect in progress.
    if (!hasSessionHint || authStatus === 'unauthenticated') {
        return (
            <PageLoader
                title="Redirecting to login"
                subtitle="Your session has expired or is unavailable."
            />
        );
    }

    // Has session hint, AuthHydrator fetch is in-flight — wait.
    return (
        <PageLoader
            title="Verifying session"
            subtitle="Checking account and permissions..."
        />
    );
}
