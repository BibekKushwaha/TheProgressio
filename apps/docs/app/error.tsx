"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";

const actionClasses = {
    retry:
        "px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors inline-flex items-center justify-center gap-2",
    dashboard:
        "px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/30 transition-colors",
};

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.16),_transparent_36%),linear-gradient(140deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-white flex items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-300" />
                </div>
                <h1 className="text-xl font-bold mt-4">Something went wrong</h1>
                <p className="text-sm text-slate-300 mt-2">
                    {error.message || "An unexpected error occurred while rendering this page."}
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className={actionClasses.retry}
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Try again
                    </button>
                    <Link
                        href="/dashboard"
                        className={actionClasses.dashboard}
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
