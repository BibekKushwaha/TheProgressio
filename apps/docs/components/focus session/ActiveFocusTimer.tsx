// components/focus-session/ActiveFocusTimer.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SkipForward, Pause, Play, Square } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CircularProgress } from './CircularProgess';
import { AmbiencePanel } from './AmbinencePanel';
import { StrictModeToggle } from './StrictModeToggle';
import { useLogSessionMutation, SessionType } from '@repo/store';

interface ActiveFocusTimerProps {
    onComplete: () => void;
}

export function ActiveFocusTimer({ onComplete }: ActiveFocusTimerProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const taskTitle = searchParams.get('task') || searchParams.get('goal') || 'Deep Work Session';
    const taskId = searchParams.get('taskId') || '';
    const durationParam = Number(searchParams.get('duration')) || 25;

    // Check if duration is a valid number
    const initialMinutes = isNaN(durationParam) ? 25 : durationParam;

    const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
    const [isPaused, setIsPaused] = useState(false);
    const totalTime = initialMinutes * 60;
    const startTimeRef = useRef(new Date().toISOString());
    const [logSession] = useLogSessionMutation();

    const handleSessionEnd = useCallback(async () => {
        if (taskId) {
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
    }, [taskId, totalTime, timeLeft, logSession, onComplete]);

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

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
            <div className="mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-sm">
                        Currently Focusing on: <span className="font-semibold">{taskTitle}</span>
                    </span>
                </div>
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
                    onClick={() => setIsPaused(!isPaused)}
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
                    onClick={() => router.back()}
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
                    "Focus is a superpower. You are doing great."
                </p>
            </div>
        </div>
    );
}