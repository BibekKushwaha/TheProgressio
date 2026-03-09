// components/focus-session/ActiveFocusTimer.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SkipForward, Pause, Play, Square } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CircularProgress } from './CircularProgress';
import { AmbiencePanel } from './AmbiencePanel';
import { StrictModeToggle } from './StrictModeToggle';
import DurationSelect from '@/components/ui/DurationSelect';
import {
    useHeartbeatLiveSessionMutation,
    useLogSessionMutation,
    usePauseLiveSessionMutation,
    useResumeLiveSessionMutation,
    SessionType,
    useStartLiveSessionMutation,
    useStopLiveSessionMutation,
} from '@repo/store';

interface ActiveFocusTimerProps {
    onComplete: () => void;
}

export function ActiveFocusTimer({ onComplete }: ActiveFocusTimerProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const paramTaskTitle = searchParams.get('task') || searchParams.get('goal') || 'Deep Work Session';
    const rawTaskId = searchParams.get('taskId');
    const taskId = (() => {
        const normalized = (rawTaskId || '').trim();
        if (!normalized) return '';
        if (['undefined', 'null', 'nan'].includes(normalized.toLowerCase())) return '';
        return normalized;
    })();
    const paramDuration = Number(searchParams.get('duration')) || 25;
    const intensityParam = Number(searchParams.get('intensity')) || 75;
    const avoidBackToBack = searchParams.get('avoidBackToBack') !== '0';
    const prioritizeMorning = searchParams.get('prioritizeMorning') !== '0';
    const recommendedStart = searchParams.get('recommendedStart') || '';
    const recommendedEnd = searchParams.get('recommendedEnd') || '';

    // Check if duration is a valid number
    const initialMinutesFromParams = Number.isNaN(paramDuration) ? 25 : paramDuration;
    const sessionIntensity = Math.max(0, Math.min(100, Number.isNaN(intensityParam) ? 75 : intensityParam));

    const [currentTaskTitle, setCurrentTaskTitle] = useState<string>(paramTaskTitle);
    const [initialMinutes, setInitialMinutes] = useState<number>(initialMinutesFromParams);
    const [timeLeft, setTimeLeft] = useState(initialMinutesFromParams * 60);
    const [isPaused, setIsPaused] = useState(false);
    const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
    // restoredFromStorage flag not required; removed to avoid unused-var warning
    const totalTime = initialMinutes * 60;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    const startTimeRef = useRef(new Date().toISOString());
    const liveBootstrapRef = useRef(false);
    // Ref that always holds the latest timeLeft without being a dep of the heartbeat effect.
    // This prevents the 15 s interval from being torn down and re-created every second.
    const timeLeftRef = useRef(timeLeft);
    const [logSession] = useLogSessionMutation();
    const [startLiveSession] = useStartLiveSessionMutation();
    const [pauseLiveSession] = usePauseLiveSessionMutation();
    const [resumeLiveSession] = useResumeLiveSessionMutation();
    const [heartbeatLiveSession] = useHeartbeatLiveSessionMutation();
    const [stopLiveSession] = useStopLiveSessionMutation();

    const onDurationChange = (minutes: number) => {
        // preserve elapsed time proportionally when changing planned duration
        const oldTotal = initialMinutes * 60;
        const elapsed = Math.max(0, oldTotal - timeLeft);
        const newTotal = Math.max(1, Math.min(360, Math.floor(minutes))) * 60;
        const newTimeLeft = Math.max(0, newTotal - elapsed);
        setInitialMinutes(newTotal / 60);
        setTimeLeft(newTimeLeft);
    };

    // Try to restore an active session from localStorage (so LiveActivityWidget can resume)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem('activeFocusSession');
            if (!raw) return;
            const parsed = JSON.parse(raw) as unknown;
            if (!parsed || typeof parsed !== 'object') return;

            const parsedObj = parsed as Record<string, unknown>;
            if (!parsedObj.startTime) return;

            const start = new Date(parsedObj.startTime as string).getTime();
            if (Number.isNaN(start)) return;

            const savedDuration = typeof parsedObj.duration === 'number' ? parsedObj.duration : initialMinutesFromParams;
            const savedIsPaused = typeof parsedObj.isPaused === 'boolean' ? parsedObj.isPaused : false;
            const savedTaskTitle = typeof parsedObj.taskTitle === 'string' ? parsedObj.taskTitle : paramTaskTitle;
            const savedSessionId = typeof parsedObj.sessionId === 'string' ? parsedObj.sessionId : null;

            const now = Date.now();
            const secondsElapsed = Math.floor((now - start) / 1000);
            const remaining = Math.max(0, savedDuration * 60 - secondsElapsed);

            setCurrentTaskTitle(savedTaskTitle);
            setInitialMinutes(savedDuration);
            setTimeLeft(remaining);
            setIsPaused(savedIsPaused);
            setLiveSessionId(savedSessionId);
            if (savedSessionId) {
                // prevent booting a new live session
                liveBootstrapRef.current = true;
            }
            // set startTimeRef to the saved start time so logging uses correct value
            if (parsedObj.startTime) startTimeRef.current = String(parsedObj.startTime);
        } catch {
            void 0; // ignore parse/restore errors
        }
    }, [initialMinutesFromParams, paramTaskTitle]);

    useEffect(() => {
        if (!taskId || liveBootstrapRef.current) return;
        liveBootstrapRef.current = true;

        const boot = async () => {
            try {
                const response = await startLiveSession({
                    taskId,
                    taskTitle: currentTaskTitle,
                    plannedDurationMinutes: initialMinutes,
                    sessionType: SessionType.DEEP_WORK,
                    source: 'web-dashboard',
                    recommendedStart: recommendedStart || undefined,
                    recommendedEnd: recommendedEnd || undefined,
                }).unwrap();

                setLiveSessionId(response.session.sessionId);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('activeFocusSessionId', response.session.sessionId);
                }
            } catch (error: unknown) {
                const err = error as { status?: number; data?: { message?: string }; message?: string };
                // A stale/invalid taskId can legitimately 404 (e.g. deleted task or bad deep-link).
                if (err?.status !== 404) {
                    console.error('Failed to start live focus session:', err?.data?.message || err?.message || error);
                }
            }
        };

        void boot();
    }, [taskId, currentTaskTitle, initialMinutes, recommendedStart, recommendedEnd, startLiveSession]);

    const handleSessionEnd = useCallback(async () => {
        let handledByLiveContract = false;
        if (liveSessionId) {
            try {
                await stopLiveSession({
                    sessionId: liveSessionId,
                    outcome: 'COMPLETED',
                }).unwrap();
                handledByLiveContract = true;
            } catch (error: unknown) {
                const err = error as { status?: number; data?: { message?: string }; message?: string };
                // If 404, it likely means the session was already closed or expired (e.g. heartbeat timeout)
                if (err?.status !== 404) {
                    console.error(`Failed to stop live focus session [${liveSessionId}]:`, err?.data?.message || err?.message || err);
                }
            }
        }

        setLiveSessionId(null);

        if (typeof window !== 'undefined') {
            localStorage.removeItem('activeFocusSession');
            localStorage.removeItem('activeFocusSessionId');
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification('Focus session complete', {
                        body: `${currentTaskTitle} finished`,
                    });
                } catch {
                    // no-op if browser blocks direct notifications
                }
            }
        }

        if (!handledByLiveContract && taskId) {
            const elapsedMinutes = Math.round((totalTime - timeLeft) / 60);
            try {
                await logSession({
                    taskId,
                    startTime: startTimeRef.current,
                    endTime: new Date().toISOString(),
                    durationMinutes: elapsedMinutes,
                    sessionType: SessionType.DEEP_WORK,
                });
            } catch (e) {
                // Session logging is best-effort; don't block completion
                console.error('Failed to log focus session:', e);
            }
        }
        onComplete();
    }, [liveSessionId, stopLiveSession, taskId, currentTaskTitle, totalTime, timeLeft, logSession, onComplete]);

    // Keep timeLeftRef in sync so the heartbeat can read the latest value without
    // being included in the heartbeat useEffect dep array.
    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused]); // Removed handleSessionEnd from deps to avoid re-triggering interval weirdly if it changes

    // Handle session end when timer hits zero
    useEffect(() => {
        if (timeLeft <= 0 && !isPaused) {
            handleSessionEnd();
        }
    }, [timeLeft, isPaused, handleSessionEnd]);

    useEffect(() => {
        if (!liveSessionId || isPaused) return;

        // timeLeftRef is read inside the interval callback so we always send the
        // current remaining seconds without making timeLeft a dep (which would
        // tear down and re-create this interval every second — 60×/min instead of 4×/min).
        const interval = setInterval(() => {
            heartbeatLiveSession({
                sessionId: liveSessionId,
                remainingSeconds: timeLeftRef.current,
            }).unwrap().catch((error: unknown) => {
                const err = error as { status?: number; data?: { message?: string }; message?: string };
                // Only log if not a 404 (session expired/replaced)
                if (err?.status !== 404) {
                    console.error('Focus heartbeat failed:', err?.data?.message || err?.message || err);
                }
            });
        }, 15000);

        return () => clearInterval(interval);
        // timeLeft intentionally excluded — use timeLeftRef instead to avoid interval churn.
    }, [liveSessionId, isPaused, heartbeatLiveSession]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('activeFocusSession', JSON.stringify({
            taskTitle: currentTaskTitle,
            startTime: startTimeRef.current,
            duration: initialMinutes,
            isPaused,
            ...(liveSessionId && { sessionId: liveSessionId }),
        }));
    }, [currentTaskTitle, initialMinutes, isPaused, timeLeft, liveSessionId]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} • Focus`;
        return () => {
            document.title = 'Student Activity Tracker';
        };
    }, [minutes, seconds]);

    const handleStop = async () => {
        if (liveSessionId) {
            try {
                await stopLiveSession({
                    sessionId: liveSessionId,
                    outcome: 'CANCELLED',
                }).unwrap();
            } catch (error: unknown) {
                const err = error as { status?: number; data?: { message?: string }; message?: string };
                if (err?.status !== 404) {
                    console.error(`Failed to cancel live focus session [${liveSessionId}]:`, err?.data?.message || err?.message || err);
                }
            }
        }

        setLiveSessionId(null);

        if (typeof window !== 'undefined') {
            localStorage.removeItem('activeFocusSession');
            localStorage.removeItem('activeFocusSessionId');
        }
        router.back();
    };

    // Navigate back without stopping or clearing the active session
    const handleBackNav = () => {
        router.back();
    };

    const togglePause = async () => {
        const nextPaused = !isPaused;
        setIsPaused(nextPaused);

        if (!liveSessionId) return;

        try {
            if (nextPaused) {
                await pauseLiveSession({ sessionId: liveSessionId }).unwrap();
            } else {
                await resumeLiveSession({ sessionId: liveSessionId }).unwrap();
            }
        } catch (error) {
            console.error('Failed to toggle live focus pause state:', error);
            setIsPaused(!nextPaused);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
            <div className="mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">
                        Currently Focusing on: <span className="font-semibold">{currentTaskTitle}</span>
                    </span>
                    <div className="ml-3">
                        <DurationSelect value={initialMinutes} onChange={onDurationChange} />
                    </div>
                </div>
                <div className="mt-2 text-center text-xs text-slate-400">
                    Intensity {sessionIntensity}% • {avoidBackToBack ? 'Break-friendly' : 'Back-to-back allowed'} • {prioritizeMorning ? 'Morning priority' : 'Flexible timing'}
                </div>
                {recommendedStart && recommendedEnd && (
                    <div className="mt-1 text-center text-xs text-cyan-300">
                        Suggested slot: {recommendedStart} - {recommendedEnd}
                    </div>
                )}
            </div>

            <div className="mb-12">
                <CircularProgress progress={progress}>
                    <div className="text-8xl font-bold tabular-nums">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </div>
                </CircularProgress>
            </div>

            <div className="flex items-center gap-4 mb-16">
                <button
                    className="w-12 h-12 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300 shadow-lg"
                    aria-label="Back"
                    onClick={handleBackNav}
                >
                    ←
                </button>

                <button
                    className="w-16 h-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300 shadow-lg"
                    aria-label="Skip"
                    onClick={handleSessionEnd}
                >
                    <SkipForward className="w-6 h-6" />
                </button>

                <button
                    onClick={togglePause}
                    className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 shadow-xl shadow-purple-500/30"
                    aria-label={isPaused ? 'Play' : 'Pause'}
                >
                    {isPaused ? (
                        <Play className="w-8 h-8 ml-1" />
                    ) : (
                        <Pause className="w-8 h-8" />
                    )}
                </button>

                <button
                    onClick={handleStop}
                    className="w-16 h-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-300 shadow-lg"
                    aria-label="Stop"
                >
                    <Square className="w-6 h-6" />
                </button>
            </div>

            <div className="absolute bottom-8 left-8">
                <AmbiencePanel />
            </div>

            <div className="absolute bottom-8 right-8">
                <StrictModeToggle />
            </div>

            <div className="absolute bottom-8 text-center">
                <p className="text-slate-400 italic">
                    &quot;Focus is a superpower. You are doing great.&quot;
                </p>
            </div>
        </div>
    );
}
