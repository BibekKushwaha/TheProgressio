'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { reportError } from '@/lib/errorReporter';

interface Props {
    children: ReactNode;
    /** Label used in error reports to identify which analytics section failed */
    context?: string;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Client-side React error boundary for the analytics section.
 *
 * Catches synchronous render errors (e.g. accessing `.totalHours` on undefined,
 * unexpected empty arrays from the backend, recharts unhandled shape mismatches)
 * and displays a graceful retry UI instead of crashing the whole dashboard.
 *
 * Next.js `error.tsx` files handle async route-level errors; this boundary
 * handles render-phase errors inside components that don't propagate upward.
 */
export class AnalyticsErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        reportError(error, {
            context: this.props.context ?? 'analytics',
            componentStack: info.componentStack?.slice(0, 500) ?? '',
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="flex flex-1 items-center justify-center min-h-[60vh] p-6">
                <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-6 text-center text-white">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-300" />
                    </div>
                    <h2 className="text-lg font-bold mt-4">Something went wrong</h2>
                    <p className="text-sm text-slate-400 mt-2 font-mono text-xs break-all">
                        {this.state.error?.message || 'An unexpected error occurred in the analytics view.'}
                    </p>
                    <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={this.handleReset}
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
}
