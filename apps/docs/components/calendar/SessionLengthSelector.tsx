// components/configure-study/SessionLengthSelector.tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const sessions = [
    { value: 25, label: '25m', subtitle: 'Pomodoro' },
    { value: 50, label: '50m', subtitle: 'Standard' },
    { value: 90, label: '90m', subtitle: 'Deep Work' },
];

interface SessionLengthSelectorProps {
    value?: number;
    onChange?: (minutes: number) => void;
    className?: string;
}

export function SessionLengthSelector({ value, onChange, className }: SessionLengthSelectorProps) {
    const [selected, setSelected] = useState(50);
    const selectedValue = value ?? selected;

    const handleSelect = (minutes: number) => {
        if (value === undefined) {
            setSelected(minutes);
        }
        onChange?.(minutes);
    };

    return (
        <div className={className}>
            <label className="block text-sm font-semibold text-white mb-2">
                Session Length
            </label>

            <div className="grid grid-cols-3 gap-3">
                {sessions.map((session) => (
                    <button
                        type="button"
                        key={session.value}
                        onClick={() => handleSelect(session.value)}
                        className={cn(
                            "px-4 py-3 rounded-xl font-semibold transition-all duration-300 border",
                            selectedValue === session.value
                                ? 'bg-purple-600 text-white border-purple-400/60 shadow-lg shadow-purple-500/30'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        )}
                    >
                        <div>{session.label}</div>
                        {session.subtitle && (
                            <div className="text-[10px] opacity-75 uppercase tracking-wide">{session.subtitle}</div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
