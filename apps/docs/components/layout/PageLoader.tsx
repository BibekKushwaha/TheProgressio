"use client";

import { Loader2 } from "lucide-react";

interface PageLoaderProps {
    title?: string;
    subtitle?: string;
    fullScreen?: boolean;
}

export function PageLoader({
    title = "Preparing your workspace",
    subtitle = "Syncing profile and loading latest data...",
    fullScreen = true,
}: PageLoaderProps) {
    const containerClasses = fullScreen
        ? "min-h-screen w-full bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.10),_transparent_42%),linear-gradient(140deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-white flex items-center justify-center p-6 overflow-hidden"
        : "w-full py-12 flex items-center justify-center overflow-hidden";

    return (
        <div className={containerClasses}>
            <style>{`
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                @keyframes glow {
                    0%, 100% {
                        box-shadow: 0 0 20px rgba(34, 211, 238, 0.3), inset 0 0 20px rgba(34, 211, 238, 0.1);
                    }
                    50% {
                        box-shadow: 0 0 30px rgba(34, 211, 238, 0.5), inset 0 0 30px rgba(34, 211, 238, 0.15);
                    }
                }
                .page-loader-card {
                    animation: slideInUp 0.6s ease-out;
                }
                .loader-spinner {
                    animation: spin 2s linear infinite;
                }
                .progress-shimmer {
                    animation: shimmer 2s infinite;
                }
                .spinner-glow {
                    animation: glow 3s ease-in-out infinite;
                }
            `}</style>
            
            <div className="page-loader-card w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl p-8 text-center shadow-2xl">
                {/* Animated spinner */}
                <div className="mx-auto mb-6 relative w-14 h-14">
                    <div className="spinner-glow absolute inset-0 rounded-lg bg-cyan-500/10 border border-cyan-400/30" />
                    <div className="absolute inset-0 rounded-lg flex items-center justify-center">
                        <Loader2 className="w-7 h-7 text-cyan-300 loader-spinner" />
                    </div>
                </div>
                
                {/* Title */}
                <h2 className="text-xl font-bold text-white mb-2 tracking-tight">{title}</h2>
                
                {/* Subtitle with animated dots */}
                <p className="text-sm text-slate-400 mb-6 inline-block">
                    {subtitle}
                    <span className="inline-block ml-1 w-1">
                        <span className="animate-bounce" style={{ animationDelay: "0s" }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                    </span>
                </p>
                
                {/* Enhanced progress bar */}
                <div className="mt-6 space-y-2">
                    <div className="h-1 rounded-full bg-white/10 overflow-hidden shadow-lg">
                        <div className="progress-shimmer h-full w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Please wait...</p>
                </div>
            </div>
        </div>
    );
}
