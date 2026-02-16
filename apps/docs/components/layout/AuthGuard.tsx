"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    hydrateAuth,
    selectIsAuthenticated,
    useAppDispatch,
    useAppSelector,
    useGetProfileQuery,
} from "@repo/store";
import { PageLoader } from "@/components/layout/PageLoader";

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const dispatch = useAppDispatch();
    const router = useRouter();

    const { data, isLoading, isFetching, isSuccess, isError } = useGetProfileQuery();

    useEffect(() => {
        if (isSuccess && data?.user && !isAuthenticated) {
            dispatch(hydrateAuth({ user: data.user }));
        }
    }, [data, dispatch, isAuthenticated, isSuccess]);

    useEffect(() => {
        // Redirect if there's an auth error or if not authenticated after query completes
        if (isError && !isLoading && !isFetching) {
            router.replace("/login");
        }
    }, [isError, isLoading, isFetching, router]);

    useEffect(() => {
        // If we're not authenticated and query is done (not loading), redirect
        if (!isAuthenticated && !isLoading && !isFetching && !isSuccess) {
            router.replace("/login");
        }
    }, [isAuthenticated, isLoading, isFetching, isSuccess, router]);

    if (isLoading || isFetching) {
        return <PageLoader title="Verifying session" subtitle="Checking account and permissions..." />;
    }

    if (isSuccess && data?.user) {
        return <>{children}</>;
    }

    // Fallback: if we reach here and user isn't authenticated, stay on loader while redirect processes
    if (!isAuthenticated || isError) {
        return <PageLoader title="Redirecting to login" subtitle="Your session has expired or is unavailable." />;
    }

    return <>{children}</>;
}
