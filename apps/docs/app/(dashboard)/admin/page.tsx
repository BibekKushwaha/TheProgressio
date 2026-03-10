"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@repo/store";
import { selectCurrentUser, selectIsAdmin } from "@repo/store";
import { Shield, Users, TrendingUp, AlertTriangle, RefreshCcw, Activity } from "lucide-react";

type LowInputTelemetrySnapshot = {
    generatedAt: string;
    lastEventAt: string | null;
    metrics: Record<string, number>;
};

export default function AdminPage() {
    const user = useAppSelector(selectCurrentUser);
    const isAdmin = useAppSelector(selectIsAdmin);
    const [telemetry, setTelemetry] = useState<LowInputTelemetrySnapshot | null>(null);
    const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);
    const [telemetryError, setTelemetryError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdmin) return;

        const controller = new AbortController();
        const loadTelemetry = async () => {
            setIsLoadingTelemetry(true);
            setTelemetryError(null);
            try {
                const response = await fetch("/api/low-input-telemetry", {
                    method: "GET",
                    signal: controller.signal,
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error(`Telemetry request failed with ${response.status}`);
                }

                const data = await response.json() as LowInputTelemetrySnapshot;
                setTelemetry(data);
            } catch (error) {
                if (controller.signal.aborted) return;
                setTelemetryError(error instanceof Error ? error.message : "Failed to load telemetry");
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingTelemetry(false);
                }
            }
        };

        void loadTelemetry();
        return () => controller.abort();
    }, [isAdmin]);

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
            <div className="flex items-center justify-between gap-4">
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
                <button
                    type="button"
                    onClick={async () => {
                        setIsLoadingTelemetry(true);
                        setTelemetryError(null);
                        try {
                            const response = await fetch("/api/low-input-telemetry", {
                                method: "GET",
                                cache: "no-store",
                            });
                            if (!response.ok) {
                                throw new Error(`Telemetry request failed with ${response.status}`);
                            }
                            const data = await response.json() as LowInputTelemetrySnapshot;
                            setTelemetry(data);
                        } catch (error) {
                            setTelemetryError(error instanceof Error ? error.message : "Failed to load telemetry");
                        } finally {
                            setIsLoadingTelemetry(false);
                        }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                    <RefreshCcw className={`w-4 h-4 ${isLoadingTelemetry ? "animate-spin" : ""}`} />
                    Refresh telemetry
                </button>
            </div>

            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-cyan-300" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">Low-Input Telemetry</h2>
                        <p className="text-sm text-slate-400">
                            Timetable import and habit quick-create conversion signals.
                        </p>
                    </div>
                </div>

                {telemetryError ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                        {telemetryError}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                            <span>Generated: {telemetry?.generatedAt ? new Date(telemetry.generatedAt).toLocaleString() : "Loading..."}</span>
                            <span>Last event: {telemetry?.lastEventAt ? new Date(telemetry.lastEventAt).toLocaleString() : "None"}</span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                title="Preview Requests"
                                value={telemetry?.metrics.preview_requests}
                                description="Timetable preview attempts"
                            />
                            <MetricCard
                                title="Imports Completed"
                                value={telemetry?.metrics.import_completed}
                                description="Completed timetable imports"
                            />
                            <MetricCard
                                title="Habit Parse Success"
                                value={telemetry?.metrics.habit_parse_successes}
                                description="Successful habit draft parses"
                            />
                            <MetricCard
                                title="Quick Create Complete"
                                value={telemetry?.metrics.habit_quick_create_completed}
                                description="Completed habit quick-create actions"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <TelemetryList
                                title="Confidence Distribution"
                                items={[
                                    { label: "High confidence rows", value: telemetry?.metrics.confidence_high_total },
                                    { label: "Medium confidence rows", value: telemetry?.metrics.confidence_medium_total },
                                    { label: "Low confidence rows", value: telemetry?.metrics.confidence_low_total },
                                ]}
                            />
                            <TelemetryList
                                title="Subject Resolution"
                                items={[
                                    { label: "Auto matched", value: telemetry?.metrics.subject_auto_matched_total },
                                    { label: "Ambiguous", value: telemetry?.metrics.subject_ambiguous_total },
                                    { label: "New subjects created", value: telemetry?.metrics.subject_new_total },
                                ]}
                            />
                        </div>
                    </div>
                )}
            </section>

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

interface MetricCardProps {
    title: string;
    value?: number;
    description: string;
}

function MetricCard({ title, value, description }: MetricCardProps) {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-2">
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-3xl font-semibold text-white">{value ?? 0}</p>
            <p className="text-xs text-slate-500">{description}</p>
        </div>
    );
}

function TelemetryList({
    title,
    items,
}: {
    title: string;
    items: Array<{ label: string; value?: number }>;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <div className="space-y-2">
                {items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white font-medium">{item.value ?? 0}</span>
                    </div>
                ))}
            </div>
        </div>
    );
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
