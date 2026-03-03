import { Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { LazyPushManager } from "@/components/LazyPushManager";

function DashboardPageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
            </div>
            <Skeleton className="h-64 rounded-2xl" />
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30 overflow-x-hidden">
                {/*
                  * Decorative ambient background — implemented as CSS radial-gradients
                  * instead of blur-filtered divs. Identical visual result with zero
                  * GPU compositing cost (no filter layer, no paint on scroll).
                  */}
                <div
                    className="fixed inset-0 z-0 pointer-events-none"
                    aria-hidden="true"
                    style={{
                        background:
                            'radial-gradient(ellipse 500px 500px at -10% -20%, rgba(99,102,241,0.05) 0%, transparent 70%), ' +
                            'radial-gradient(ellipse 600px 600px at 105% 110%, rgba(139,92,246,0.05) 0%, transparent 70%)',
                    }}
                />

                <Sidebar />
                <LazyPushManager />

                <main className="lg:pl-72 pt-16 lg:pt-8 pb-10 min-h-screen relative z-10 transition-[padding-left] duration-300">
                    <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 ">
                        <Suspense fallback={<DashboardPageSkeleton />}>
                            {children}
                        </Suspense>
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
