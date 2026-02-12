// app/focus-session/page.tsx
'use client';

import { useState } from 'react';
import { ActiveFocusTimer } from '@/components/focus session/ActiveFocusTimer';
import { SessionComplete } from '@/components/focus session/SessionComplete';
import { Focus, Sparkles } from 'lucide-react';

export default function FocusSessionPage() {
    const [isComplete, setIsComplete] = useState(false);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_38%),linear-gradient(135deg,_#020617_0%,_#111827_45%,_#0f172a_100%)] text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />

            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-xs text-indigo-100 backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    <Focus className="w-3.5 h-3.5 text-cyan-300" />
                    Focus Session Mode
                </div>
            </div>

            {!isComplete ? (
                <ActiveFocusTimer onComplete={() => setIsComplete(true)} />
            ) : (
                <SessionComplete />
            )}
        </div>
    );
}
