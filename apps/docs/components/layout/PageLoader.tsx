"use client";

import { Loader2 } from "lucide-react";

interface PageLoaderProps {
    title?: string;
    subtitle?: string;
}

export function PageLoader({
    title = "Preparing your workspace",
    subtitle = "Syncing profile and loading latest data...",
}: PageLoaderProps) {
    return (
        <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.10),_transparent_42%),linear-gradient(140deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 text-center">
                <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-cyan-300 animate-spin" />
                </div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
                <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
