"use client";

import Sidebar from "@/components/landing/sidebar";
import { AuthGuard } from "@/components/layout/AuthGuard";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">
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
        </AuthGuard>
    );
}
