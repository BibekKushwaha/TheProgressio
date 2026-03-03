"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@repo/store";
import { selectCurrentUser, selectIsAdmin } from "@repo/store";
import { Shield, Users, TrendingUp, AlertTriangle } from "lucide-react";

export default function AdminPage() {
    const router = useRouter();
    const user = useAppSelector(selectCurrentUser);
    const isAdmin = useAppSelector(selectIsAdmin);

    // Redirect non-admin users away from this page
    useEffect(() => {
        if (user && !isAdmin) {
            router.replace("/dashboard");
        }
    }, [user, isAdmin, router]);

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto" />
                    <h1 className="text-2xl font-bold text-white">Access Denied</h1>
                    <p className="text-gray-400">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-red-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Logged in as <span className="text-red-300 font-medium">{user?.username}</span>
                    </p>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AdminCard
                    icon={<Users className="w-6 h-6 text-indigo-400" />}
                    title="Revenue Dashboard"
                    description="View payment stats, transactions, and reconciliation reports."
                    href="/admin/revenue"
                />
                <AdminCard
                    icon={<TrendingUp className="w-6 h-6 text-green-400" />}
                    title="Platform Analytics"
                    description="System-wide usage metrics and active user insights."
                    href="/analytics/overview"
                />
                <AdminCard
                    icon={<Shield className="w-6 h-6 text-red-400" />}
                    title="Role: ADMIN"
                    description={`Your account (${user?.email}) has full administrative privileges.`}
                />
            </div>
        </div>
    );
}

interface AdminCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    href?: string;
}

function AdminCard({ icon, title, description, href }: AdminCardProps) {
    const router = useRouter();

    return (
        <div
            className={`rounded-2xl bg-white/5 border border-white/10 p-6 space-y-3 transition-all duration-200 ${
                href ? "cursor-pointer hover:bg-white/10 hover:border-white/20" : ""
            }`}
            onClick={() => href && router.push(href)}
            role={href ? "button" : undefined}
            tabIndex={href ? 0 : undefined}
            onKeyDown={(e) => href && e.key === "Enter" && router.push(href)}
        >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="text-gray-400 text-sm mt-1">{description}</p>
            </div>
        </div>
    );
}
