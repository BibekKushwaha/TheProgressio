"use client";

import { useState } from 'react';
import { ActiveFocusTimer } from '@/components/focus-session/ActiveFocusTimer';
import { SessionComplete } from '@/components/focus-session/SessionComplete';

export function FocusSessionClient() {
    const [isComplete, setIsComplete] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
            {!isComplete ? (
                <ActiveFocusTimer onComplete={() => setIsComplete(true)} />
            ) : (
                <SessionComplete />
            )}
        </div>
    );
}
