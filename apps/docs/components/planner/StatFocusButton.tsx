'use client';

import { Play, Square } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useLogSessionMutation, SessionType } from '@repo/store';

export function StartFocusButton() {
    const { id: taskId } = useParams();
    const [isActive, setIsActive] = useState(false);
    const [seconds, setSeconds] = useState(25 * 60); // 25 minutes default
    const [startTime, setStartTime] = useState<string | null>(null);
    const [logSession] = useLogSessionMutation();

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && seconds > 0) {
            interval = setInterval(() => {
                setSeconds((prev) => prev - 1);
            }, 1000);
        } else if (seconds === 0 && isActive) {
            handleStop();
        }

        return () => clearInterval(interval);
    }, [isActive, seconds]);

    const handleStart = () => {
        setIsActive(true);
        setStartTime(new Date().toISOString());
        console.log("Focus session started!");
    };

    const handleStop = useCallback(async () => {
        setIsActive(false);
        const endTime = new Date().toISOString();
        const duration = Math.round((25 * 60 - seconds) / 60);

        if (duration >= 1 && taskId) {
            try {
                await logSession({
                    taskId: taskId as string,
                    startTime: startTime!,
                    endTime,
                    durationMinutes: duration,
                    sessionType: SessionType.POMODORO
                }).unwrap();
                console.log(`Session logged: ${duration} minutes`);
            } catch (err) {
                console.error("Failed to log session", err);
            }
        }

        setSeconds(25 * 60);
        setStartTime(null);
    }, [seconds, startTime, taskId, logSession]);

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!taskId) return null;

    return (
        <div className="fixed bottom-8 right-8 z-50">
            {isActive ? (
                <button
                    onClick={handleStop}
                    className="group flex flex-col items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl font-semibold shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:-translate-y-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                            <Square className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-lg font-mono">{formatTime(seconds)}</span>
                            <span className="text-xs text-red-100 uppercase tracking-wider">Stop Focusing</span>
                        </div>
                    </div>
                </button>
            ) : (
                <button
                    onClick={handleStart}
                    className="group flex flex-col items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-semibold shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:-translate-y-1 hover:scale-105"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Play className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-lg">Start Focusing</span>
                            <span className="text-xs text-indigo-200 uppercase tracking-wider">25:00 • Pomodoro</span>
                        </div>
                    </div>
                </button>
            )}
        </div>
    );
}