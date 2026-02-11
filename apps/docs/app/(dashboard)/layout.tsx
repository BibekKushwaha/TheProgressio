"use client";
import { useEffect } from "react";
import Sidebar from "../../components/landing/sidebar";
import { hydrateAuth, selectIsAuthenticated, useAppDispatch, useAppSelector, useGetProfileQuery } from "@repo/store";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { data, isLoading, isFetching, isSuccess, isError, error } = useGetProfileQuery();

    useEffect(() => {
        if (isSuccess && data?.user && !isAuthenticated) {
            dispatch(hydrateAuth({ user: data.user }));
        }
    }, [isSuccess, data, isAuthenticated, dispatch]);

    useEffect(() => {
        if (isLoading || isFetching) return;
        if (!isError) return;

        const status = 'status' in error ? error.status : undefined;
        if (status === 401 || status === 404) {
            router.push('/login');
        }
  }, [isLoading, isFetching, isError, error, router]);

    if (isLoading || isFetching) return null;
    if (isSuccess && data?.user) return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px]" />
            </div>

            <Sidebar />

            <main className="lg:pl-64 min-h-screen relative z-10 transition-all duration-300">
                <div className="container mx-auto p-4 lg:p-8 pt-20 lg:pt-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px]" />
            </div>

            <Sidebar />

            <main className="lg:pl-64 min-h-screen relative z-10 transition-all duration-300">
                <div className="container mx-auto p-4 lg:p-8 pt-20 lg:pt-8 max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
