'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Pause, Play, Loader2 } from 'lucide-react';
import { useGetActiveLiveSessionQuery } from '@repo/store';

// ── LiveTimer (isolated) ────────────────────────────────────────────────────
//
// Previously, elapsed time was tracked in LiveActivityWidget's own state,
// meaning setElapsed() called from setInterval fired setState on the entire
// widget tree every second.  At 60 executions/minute with the progress bar,
// task title, pulsing indicator, and icon all inside scope, this was
// wasteful.
//
// Solution: extract the clock tick into its own tiny component. React's
// reconciliation only re-renders <LiveTimer /> on each second tick — the
// parent widget only re-renders when remote session data changes.

interface LiveTimerProps {
    startTime: string;
    durationMinutes: number;
    isPaused: boolean;
    onExpired: () => void;
}

function LiveTimer({ startTime, durationMinutes, isPaused, onExpired }: LiveTimerProps) {
    const [elapsed, setElapsed] = useState(() =>
        Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
    );

    useEffect(() => {
        if (isPaused) return;

        const start = new Date(startTime).getTime();
        const tick = () => {
            const seconds = Math.floor((Date.now() - start) / 1000);
            setElapsed(seconds);
            // Auto-clear if expired (plus 2-minute buffer)
            if (durationMinutes > 0 && seconds > durationMinutes * 60 + 120) {
                onExpired();
            }
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startTime, durationMinutes, isPaused, onExpired]);

    const remaining = Math.max(0, durationMinutes * 60 - elapsed);
    const mm = Math.floor(remaining / 60);
    const ss = remaining % 60;
    const progress = durationMinutes > 0
        ? Math.min(100, (elapsed / (durationMinutes * 60)) * 100)
        : 0;

    return (
        <>
            <div className="text-3xl font-black text-white font-mono tracking-tighter tabular-nums">
                {mm.toString().padStart(2, '0')}:{ss.toString().padStart(2, '0')}
            </div>
            <div className="space-y-2">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400 transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Session: {Math.round(progress)}% Complete</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                        {isPaused ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                        {durationMinutes}m Total
                    </span>
                </div>
            </div>
        </>
    );
}


// ── LiveActivityWidget ────────────────────────────────────────────────────────
// This widget checks remote DB (primary) then falls back to localStorage for
// an active focus session.
export function LiveActivityWidget() {
    const router = useRouter();
    const {
        data: remoteData,
        isLoading: isRemoteLoading,
        refetch,
        isUninitialized,
    } = useGetActiveLiveSessionQuery(undefined, { refetchOnMountOrArgChange: true });

    const [session, setSession] = useState<{
        taskTitle: string;
        startTime: string;
        duration: number;
        isPaused: boolean;
    } | null>(null);

    const checkLocalSession = useCallback(() => {
        try {
            const raw = localStorage.getItem('activeFocusSession');
            if (raw) {
                const parsed = JSON.parse(raw);
                const maybeStart = parsed.startTime ?? parsed.startedAt ?? parsed.start;
                if (maybeStart) {
                    return {
                        taskTitle: parsed.taskTitle || 'Focus Session',
                        startTime: new Date(maybeStart).toISOString(),
                        duration: parsed.duration || 0,
                        isPaused: !!parsed.isPaused,
                    };
                }
            }
        } catch (e) {
            console.error('Error checking local session:', e);
        }
        return null;
    }, []);

    // Sync remote and local session state
    useEffect(() => {
        if (remoteData?.session && (remoteData.session.status === 'RUNNING' || remoteData.session.status === 'PAUSED')) {
            setSession({
                taskTitle: remoteData.session.taskTitle,
                startTime: remoteData.session.startedAt,
                duration: remoteData.session.plannedDurationMinutes,
                isPaused: remoteData.session.status === 'PAUSED',
            });
        } else {
            setSession(checkLocalSession());
        }
    }, [remoteData, checkLocalSession]);

    // Re-sync on tab visibility or cross-tab storage change
    useEffect(() => {
        const onSync = () => {
            if (!isUninitialized && typeof refetch === 'function') {
                try { refetch(); } catch { /* ignore transient errors during mount/unmount */ }
            }
            if (!remoteData?.session) {
                setSession(checkLocalSession());
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') onSync();
        };
        window.addEventListener('storage', onSync);
        window.addEventListener('focus', onSync);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('storage', onSync);
            window.removeEventListener('focus', onSync);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [refetch, checkLocalSession, remoteData, isUninitialized]);

    const handleExpired = useCallback(() => setSession(null), []);

    if (isRemoteLoading) {
        return (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex justify-center items-center h-24">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!session) return null;

    return (
        <div
            onClick={() => router.push('/focus-session')}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-5 cursor-pointer hover:border-emerald-500/40 transition-all active:scale-[0.98]"
        >
            {/* Pulsing live indicator */}
            {!session.isPaused && (
                <div className="absolute top-3 right-3 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base truncate max-w-[150px]">{session.taskTitle}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${session.isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                {session.isPaused ? 'Paused' : 'In Progress'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Only LiveTimer re-renders every second — not the whole widget */}
                <LiveTimer
                    startTime={session.startTime}
                    durationMinutes={session.duration}
                    isPaused={session.isPaused}
                    onExpired={handleExpired}
                />
            </div>
        </div>
    );
}
