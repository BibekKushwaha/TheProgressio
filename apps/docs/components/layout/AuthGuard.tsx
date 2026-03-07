"use client";

import { useEffect } from "react";
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
 * Route protection now happens at the request boundary in `proxy.ts`, where the
 * docs app verifies the current session with auth-service before protected
 * pages render. This component remains as the client-side fallback for cases
 * where a session becomes invalid after hydration, such as logout or a failed
 * refresh while the user is already inside the app.
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const authStatus = useAppSelector(selectAuthStatus);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isAuthenticated && authStatus === 'unauthenticated') {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
    }, [isAuthenticated, authStatus, router, pathname]);

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
