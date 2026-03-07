"use client";

import Link from "next/link";
import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { reportError } from '@/lib/errorReporter';

export default function TasksError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportError(error, {
            context: 'dashboard.tasks.error',
            ...(error.digest ? { digest: error.digest } : {}),
        });
    }, [error]);

    return (
        <div className="flex flex-1 items-center justify-center min-h-[60vh] p-6">
            <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-6 text-center text-white">
                <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-300" />
                </div>
                <h2 className="text-lg font-bold mt-4">Tasks failed to load</h2>
                <p className="text-sm text-slate-300 mt-2">
                    {error.message || "An unexpected error occurred loading your tasks."}
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors inline-flex items-center justify-center gap-2 text-sm"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Retry
                    </button>
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/30 transition-colors text-sm"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
