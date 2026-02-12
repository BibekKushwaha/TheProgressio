import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_36%),linear-gradient(140deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                    <Compass className="w-6 h-6 text-cyan-300" />
                </div>
                <h1 className="text-2xl font-bold mt-4">Page not found</h1>
                <p className="text-sm text-slate-400 mt-2">
                    The route you requested does not exist or may have been moved.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/dashboard"
                        className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/30 transition-colors"
                    >
                        Open Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
