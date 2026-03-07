'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { reportError } from '@/lib/errorReporter';

/**
 * Next.js global error boundary.
 *
 * This file replaces the root layout on catastrophic top-level render errors
 * (errors that escape even error.tsx at the root segment).  It must render
 * its own <html> and <body> tags because the regular layout is not available.
 *
 * Handles errors from:
 *  • Root layout crashes (providers, StoreProvider, etc.)
 *  • Unrecoverable app-level failures
 *
 * For route-segment errors (e.g. a dashboard page crashing), Next.js uses
 * the nearest error.tsx — see app/error.tsx and app/(dashboard)/analytics/error.tsx.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        reportError(error, {
            context: 'app.global-error',
            ...(error.digest ? { digest: error.digest } : {}),
        });
    }, [error]);

    return (
        <html lang="en">
            <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
                <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-8 text-center">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-7 h-7 text-red-300" />
                    </div>
                    <h1 className="text-2xl font-bold">Application Error</h1>
                    <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                        {error.message || 'A critical error occurred and the application could not render.'}
                    </p>
                    {error.digest && (
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            Error ID: {error.digest}
                        </p>
                    )}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={reset}
                            className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Try Again
                        </button>
                        <Link
                            href="/"
                            className="px-5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/30 transition-colors inline-flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <Home className="w-4 h-4" />
                            Go Home
                        </Link>
                    </div>
                </div>
            </body>
        </html>
    );
}
