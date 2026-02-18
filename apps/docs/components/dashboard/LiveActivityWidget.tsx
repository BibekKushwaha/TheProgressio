'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Pause, Play, Loader2 } from 'lucide-react';
import { useGetActiveLiveSessionQuery } from '@repo/store';

// This widget checks remote DB (primary) then fallback to localStorage for an active focus session
export function LiveActivityWidget() {
    const router = useRouter();
    const { data: remoteData, isLoading: isRemoteLoading, refetch } = useGetActiveLiveSessionQuery(undefined, {
        pollingInterval: 10000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    const [session, setSession] = useState<{
        taskTitle: string;
        startTime: string;
        duration: number;
        isPaused: boolean;
    } | null>(null);
    const [elapsed, setElapsed] = useState(0);

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

    // Sync remote and local
    useEffect(() => {
        if (remoteData?.session) {
            setSession({
                taskTitle: remoteData.session.taskTitle,
                startTime: remoteData.session.startedAt,
                duration: remoteData.session.plannedDurationMinutes,
                isPaused: remoteData.session.status === 'PAUSED',
            });
        } else {
            const local = checkLocalSession();
            setSession(local);
        }
    }, [remoteData, checkLocalSession]);

    // Handle visibility and storage changes
    useEffect(() => {
        const onSync = () => {
            refetch();
            const local = checkLocalSession();
            if (!remoteData?.session) {
                setSession(local);
            }
        };

        window.addEventListener('storage', onSync);
        window.addEventListener('focus', onSync);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') onSync();
        });

        return () => {
            window.removeEventListener('storage', onSync);
            window.removeEventListener('focus', onSync);
        };
    }, [refetch, checkLocalSession, remoteData]);

    // Timer logic
    useEffect(() => {
        if (!session || session.isPaused) return;

        const start = new Date(session.startTime).getTime();
        const update = () => {
            const now = Date.now();
            const seconds = Math.floor((now - start) / 1000);
            setElapsed(seconds);

            // Auto-clear if expired (plus 2 min buffer)
            if (session.duration > 0 && seconds > (session.duration * 60 + 120)) {
                setSession(null);
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [session]);

    if (isRemoteLoading) {
        return (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 flex justify-center items-center h-24">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!session) return null;

    const remaining = Math.max(0, session.duration * 60 - elapsed);
    const mm = Math.floor(remaining / 60);
    const ss = remaining % 60;
    const progress = session.duration > 0 ? Math.min(100, (elapsed / (session.duration * 60)) * 100) : 0;

    return (
        <div
            onClick={() => router.push('/focus-session')}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-5 cursor-pointer hover:border-emerald-500/40 transition-all active:scale-[0.98]"
        >
            {/* Pulsing indicator */}
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
                <div className="text-3xl font-black text-white font-mono tracking-tighter tabular-nums">
                    {mm.toString().padStart(2, '0')}:{ss.toString().padStart(2, '0')}
                </div>
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
                        {session.isPaused ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                        {session.duration}m Total
                    </span>
                </div>
            </div>
        </div>
    );
}

