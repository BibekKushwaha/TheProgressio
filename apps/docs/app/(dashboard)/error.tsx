"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { reportError } from '@/lib/errorReporter';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportError(error, {
            context: 'dashboard.segment.error',
            ...(error.digest ? { digest: error.digest } : {}),
        });
    }, [error]);

    return (
        <div className="flex min-h-[70vh] items-center justify-center p-6">
            <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-6 text-center text-white">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-300" />
                </div>
                <h2 className="mt-4 text-xl font-bold">This dashboard section failed to load</h2>
                <p className="mt-2 text-sm text-slate-300">
                    {error.message || 'An unexpected error occurred while rendering this page.'}
                </p>
                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Try again
                    </button>
                    <Link
                        href="/dashboard"
                        className="rounded-lg border border-cyan-400/30 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 transition-colors hover:bg-cyan-500/30"
                    >
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}