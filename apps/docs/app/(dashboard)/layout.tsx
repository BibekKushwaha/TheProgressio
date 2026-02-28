import { Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { PushNotificationManager } from "@/components/PushNotificationManager";

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
                  * Decorative ambient orbs.
                  * `will-change-transform` promotes each to its own GPU compositing layer
                  * so their blur does not trigger a full-page repaint on scroll.
                  */}
                <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] will-change-transform" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px] will-change-transform" />
                </div>

                <Sidebar />
                <PushNotificationManager />

                <main className="lg:pl-72 pt-16 lg:pt-8 pb-10 min-h-screen relative z-10 transition-all duration-300">
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
