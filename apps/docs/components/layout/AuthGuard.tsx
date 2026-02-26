"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    hydrateAuth,
    logout,
    selectIsAuthenticated,
    useAppDispatch,
    useAppSelector,
    useGetProfileQuery,
} from "@repo/store";
import { PageLoader } from "@/components/layout/PageLoader";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard handles two responsibilities:
 * 1. Redux hydration — populates the auth slice from the profile API so the
 *    rest of the app can read `selectCurrentUser` / `selectIsAuthenticated`.
 * 2. Expired-token redirect — the middleware already blocks requests with no
 *    session cookie, so this guard only fires for the uncommon case where a
 *    cookie exists but the API returns 401 (e.g. token expired mid-session).
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();

    const { data, isLoading, isFetching, isSuccess, isError } = useGetProfileQuery();

    useEffect(() => {
        // Hydrate auth state when profile query succeeds
        if (isSuccess && data?.user && !isAuthenticated) {
            dispatch(hydrateAuth({ user: data.user }));
            if (typeof window !== "undefined") {
                localStorage.setItem("auth:hasSession", "1");
            }
            return;
        }

        // Redirect when auth fails — token present but invalid/expired
        if (!isLoading && !isFetching) {
            if (isError || (!isSuccess && !isAuthenticated)) {
                dispatch(logout());
                if (typeof window !== "undefined") {
                    localStorage.removeItem("auth:hasSession");
                }
                const loginUrl = `/login?next=${encodeURIComponent(pathname)}`;
                router.replace(loginUrl);
            }
        }
    }, [data, dispatch, isAuthenticated, isError, isFetching, isLoading, isSuccess, router, pathname]);

    if (isLoading) {
        return <PageLoader title="Verifying session" subtitle="Checking account and permissions..." />;
    }

    if (isSuccess && data?.user) {
        return <>{children}</>;
    }

    // Fallback: stay on loader while redirect processes
    if (!isAuthenticated || isError) {
        return <PageLoader title="Redirecting to login" subtitle="Your session has expired or is unavailable." />;
    }

    return <>{children}</>;
}
