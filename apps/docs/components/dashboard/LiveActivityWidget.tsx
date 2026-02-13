'use client';

import { useEffect, useState } from 'react';
import { Activity, Timer, Pause, Play } from 'lucide-react';

// This widget checks localStorage for an active focus session and displays it
export function LiveActivityWidget() {
    const [session, setSession] = useState<{
        taskTitle: string;
        startTime: string;
        duration: number;
        isPaused: boolean;
    } | null>(null);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const checkSession = () => {
            try {
                const raw = localStorage.getItem('activeFocusSession');
                if (raw) {
                    setSession(JSON.parse(raw));
                } else {
                    setSession(null);
                }
            } catch {
                setSession(null);
            }
        };

        checkSession();
        const interval = setInterval(checkSession, 2000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!session || session.isPaused) return;

        const tick = () => {
            const start = new Date(session.startTime).getTime();
            const now = Date.now();
            const secondsElapsed = Math.floor((now - start) / 1000);
            if (session.duration > 0 && secondsElapsed >= session.duration * 60) {
                localStorage.removeItem('activeFocusSession');
                setSession(null);
                return;
            }
            setElapsed(secondsElapsed);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [session]);

    if (!session) return null;

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const progress = session.duration > 0 ? Math.min((elapsed / 60 / session.duration) * 100, 100) : 0;

    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5">
            {/* Animated pulse */}
            <div className="absolute top-3 right-3">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
            </div>

            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/30">
                    <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                        Live Session
                    </div>
                    <div className="text-white font-bold truncate">{session.taskTitle || 'Focus Session'}</div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-emerald-400" />
                        <span className="text-2xl font-mono font-bold text-white tabular-nums">
                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                        {session.isPaused ? (
                            <span className="flex items-center gap-1 text-xs text-yellow-400">
                                <Pause className="w-3 h-3" /> Paused
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                                <Play className="w-3 h-3" /> Active
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            {session.duration > 0 && (
                <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}
