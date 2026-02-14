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

    const { data, isLoading, isFetching, isSuccess, isError, error } = useGetProfileQuery();

    useEffect(() => {
        if (isSuccess && data?.user && !isAuthenticated) {
            dispatch(hydrateAuth({ user: data.user }));
        }
    }, [data, dispatch, isAuthenticated, isSuccess]);

    useEffect(() => {
        if (isLoading || isFetching || !isError) return;

        const status = typeof error === "object" && error && "status" in error ? error.status : undefined;
        if (status === 401 || status === 404 || status === 'FETCH_ERROR') {
            router.replace("/login");
        }
    }, [error, isError, isFetching, isLoading, router]);

    if (isLoading || isFetching) {
        return <PageLoader title="Verifying session" subtitle="Checking account and permissions..." />;
    }

    if (isSuccess && data?.user) {
        return <>{children}</>;
    }

    if (!isAuthenticated) {
        return <PageLoader title="Redirecting to login" subtitle="Your session has expired or is unavailable." />;
    }

    return <>{children}</>;
}
