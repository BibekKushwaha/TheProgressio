// components/focus-session/ActiveFocusTimer.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SkipForward, Pause, Play, Square } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CircularProgress } from './CircularProgress';
import { AmbiencePanel } from './AmbiencePanel';
import { StrictModeToggle } from './StrictModeToggle';
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
    const taskTitle = searchParams.get('task') || searchParams.get('goal') || 'Deep Work Session';
    const taskId = searchParams.get('taskId') || '';
    const durationParam = Number(searchParams.get('duration')) || 25;
    const intensityParam = Number(searchParams.get('intensity')) || 75;
    const avoidBackToBack = searchParams.get('avoidBackToBack') !== '0';
    const prioritizeMorning = searchParams.get('prioritizeMorning') !== '0';
    const recommendedStart = searchParams.get('recommendedStart') || '';
    const recommendedEnd = searchParams.get('recommendedEnd') || '';

    // Check if duration is a valid number
    const initialMinutes = isNaN(durationParam) ? 25 : durationParam;
    const sessionIntensity = Math.max(0, Math.min(100, isNaN(intensityParam) ? 75 : intensityParam));

    const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
    const [isPaused, setIsPaused] = useState(false);
    const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
    const totalTime = initialMinutes * 60;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
    const startTimeRef = useRef(new Date().toISOString());
    const liveBootstrapRef = useRef(false);
    const [logSession] = useLogSessionMutation();
    const [startLiveSession] = useStartLiveSessionMutation();
    const [pauseLiveSession] = usePauseLiveSessionMutation();
    const [resumeLiveSession] = useResumeLiveSessionMutation();
    const [heartbeatLiveSession] = useHeartbeatLiveSessionMutation();
    const [stopLiveSession] = useStopLiveSessionMutation();

    useEffect(() => {
        if (!taskId || liveBootstrapRef.current) return;
        liveBootstrapRef.current = true;

        const boot = async () => {
            try {
                const response = await startLiveSession({
                    taskId,
                    taskTitle,
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
            } catch (error) {
                console.error('Failed to start live focus session:', error);
            }
        };

        void boot();
    }, [taskId, taskTitle, initialMinutes, recommendedStart, recommendedEnd, startLiveSession]);

    const handleSessionEnd = useCallback(async () => {
        let handledByLiveContract = false;
        if (liveSessionId) {
            try {
                await stopLiveSession({
                    sessionId: liveSessionId,
                    outcome: 'COMPLETED',
                }).unwrap();
                handledByLiveContract = true;
            } catch (error) {
                console.error('Failed to stop live focus session:', error);
            }
        }

        setLiveSessionId(null);

        if (typeof window !== 'undefined') {
            localStorage.removeItem('activeFocusSession');
            localStorage.removeItem('activeFocusSessionId');
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification('Focus session complete', {
                        body: `${taskTitle} finished`,
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
    }, [liveSessionId, stopLiveSession, taskId, taskTitle, totalTime, timeLeft, logSession, onComplete]);

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleSessionEnd();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isPaused, handleSessionEnd]);

    useEffect(() => {
        if (!liveSessionId || isPaused) return;

        const interval = setInterval(() => {
            heartbeatLiveSession({
                sessionId: liveSessionId,
                remainingSeconds: timeLeft,
            }).catch((error: unknown) => {
                console.error('Focus heartbeat failed:', error);
            });
        }, 15000);

        return () => clearInterval(interval);
    }, [liveSessionId, isPaused, timeLeft, heartbeatLiveSession]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('activeFocusSession', JSON.stringify({
            taskTitle,
            startTime: startTimeRef.current,
            duration: initialMinutes,
            isPaused,
            ...(liveSessionId && { sessionId: liveSessionId }),
        }));
    }, [taskTitle, initialMinutes, isPaused, timeLeft, liveSessionId]);

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
            } catch (error) {
                console.error('Failed to cancel live focus session:', error);
            }
        }

        setLiveSessionId(null);

        if (typeof window !== 'undefined') {
            localStorage.removeItem('activeFocusSession');
            localStorage.removeItem('activeFocusSessionId');
        }
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
                        Currently Focusing on: <span className="font-semibold">{taskTitle}</span>
                    </span>
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
