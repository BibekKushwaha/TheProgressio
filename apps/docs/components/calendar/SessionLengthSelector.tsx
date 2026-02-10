// components/configure-study/SessionLengthSelector.tsx
'use client';

import { useState } from 'react';

const sessions = [
    { value: '25m', label: '25m', subtitle: '(Pomodoro)' },
    { value: '50m', label: '50m', subtitle: null },
    { value: '90m', label: '90m', subtitle: null },
];

export function SessionLengthSelector() {
    const [selected, setSelected] = useState('50m');

    return (
        <div>
            <label className="block text-sm font-semibold text-white mb-2">
                Session Length
            </label>

            <div className="grid grid-cols-3 gap-3">
                {sessions.map((session) => (
                    <button
                        key={session.value}
                        onClick={() => setSelected(session.value)}
                        className={`px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${selected === session.value
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                    >
                        <div>{session.label}</div>
                        {session.subtitle && (
                            <div className="text-xs opacity-70">{session.subtitle}</div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}