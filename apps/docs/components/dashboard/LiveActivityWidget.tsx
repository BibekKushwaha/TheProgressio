'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

    const checkSession = () => {
        try {
            const raw = localStorage.getItem('activeFocusSession');
            if (raw) {
                const parsed = JSON.parse(raw) as unknown;

                // tolerate a few possible field names and types
                const parsedObj = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : {};
                const maybeStart = parsedObj.startTime ?? parsedObj.startedAt ?? parsedObj.start;
                let startIso: string | null = null;
                if (typeof maybeStart === 'string') startIso = maybeStart;
                else if (typeof maybeStart === 'number') startIso = new Date(maybeStart).toISOString();
                else if (maybeStart && typeof maybeStart === 'object' && (maybeStart as Date) instanceof Date) startIso = (maybeStart as Date).toISOString();

                if (startIso) {
                    const taskTitle = typeof parsedObj.taskTitle === 'string'
                        ? (parsedObj.taskTitle as string)
                        : typeof parsedObj.currentTaskTitle === 'string'
                            ? (parsedObj.currentTaskTitle as string)
                            : 'Focus Session';

                    const dur = typeof parsedObj.duration === 'number'
                        ? (parsedObj.duration as number)
                        : (Number(parsedObj.duration as unknown) || 0);

                    const paused = typeof parsedObj.isPaused === 'boolean' ? (parsedObj.isPaused as boolean) : false;

                    setSession({
                        taskTitle,
                        startTime: startIso,
                        duration: dur,
                        isPaused: paused,
                    });
                    return;
                }
            }
            setSession(null);
            setElapsed(0);
        } catch {
            setSession(null);
            setElapsed(0);
        }
    };

    useEffect(() => {
        checkSession();

        // quick follow-up checks to handle tight navigation timing
        const t1 = setTimeout(checkSession, 200);
        const t2 = setTimeout(checkSession, 1000);

        const interval = setInterval(checkSession, 2000);

        // helper: temporary high-frequency poll to catch late writes
        const startShortPoll = () => {
            let tries = 0;
            const max = 20; // ~4 seconds at 200ms
            const h = setInterval(() => {
                try {
                    checkSession();
                } catch {
                    void 0;
                }
                tries += 1;
                if (tries >= max) clearInterval(h);
            }, 200);
            return h;
        };

        const onStorage = (e: StorageEvent) => {
            if (!e.key || e.key === 'activeFocusSession' || e.key === 'activeFocusSessionId') {
                checkSession();
                startShortPoll();
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                checkSession();
                startShortPoll();
            }
        };

        // navigation events (back/forward) and pageshow help catch client-side route navs
        const onPop = () => {
            checkSession();
            startShortPoll();
        };
        const onPageshow = () => {
            checkSession();
            startShortPoll();
        };

        window.addEventListener('storage', onStorage);
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('popstate', onPop);
        window.addEventListener('pageshow', onPageshow);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearInterval(interval);
            window.removeEventListener('storage', onStorage);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('popstate', onPop);
            window.removeEventListener('pageshow', onPageshow);
        };
    }, []);

    useEffect(() => {
        if (!session) return;
        if (session.isPaused) return;

        const tick = () => {
            const start = new Date(session.startTime).getTime();
            if (Number.isNaN(start)) {
                setElapsed(0);
                return;
            }
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

    const router = useRouter();

    if (!session) return null;

    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const progress = session.duration > 0 ? Math.min((elapsed / 60 / session.duration) * 100, 100) : 0;
    const SessionStatusIcon = session.isPaused ? Pause : Play;
    const sessionStatusText = session.isPaused ? 'Paused' : 'Active';
    const sessionStatusClass = session.isPaused ? 'text-yellow-400' : 'text-emerald-400';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => router.push('/focus-session')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/focus-session'); } }}
            className="relative overflow-hidden bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 cursor-pointer"
        >
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
                        <span className={`flex items-center gap-1 text-xs ${sessionStatusClass}`}>
                            <SessionStatusIcon className="w-3 h-3" /> {sessionStatusText}
                        </span>
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
