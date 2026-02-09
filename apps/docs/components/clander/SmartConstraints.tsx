// components/configure-study/SmartConstraints.tsx
'use client';

import { useState } from 'react';

const constraints = [
    {
        id: 'avoid-back-to-back',
        title: 'Avoid back-to-back classes',
        subtitle: 'Ensures you have a 15m break',
        defaultEnabled: true,
    },
    {
        id: 'prioritize-morning',
        title: 'Prioritize morning slots',
        subtitle: 'Schedule hard tasks before 12 PM',
        defaultEnabled: true,
    },
];

export function SmartConstraints() {
    const [enabled, setEnabled] = useState<Record<string, boolean>>({
        'avoid-back-to-back': true,
        'prioritize-morning': true,
    });

    const toggle = (id: string) => {
        setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Smart Constraints
            </label>

            <div className="space-y-3">
                {constraints.map((constraint) => (
                    <div
                        key={constraint.id}
                        className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
                    >
                        <div className="flex-1">
                            <div className="font-semibold text-white mb-1">
                                {constraint.title}
                            </div>
                            <div className="text-sm text-slate-400">
                                {constraint.subtitle}
                            </div>
                        </div>

                        <button
                            onClick={() => toggle(constraint.id)}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ml-4 ${enabled[constraint.id]
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                                    : 'bg-slate-700'
                                }`}
                            aria-label={`Toggle ${constraint.title}`}
                        >
                            <div
                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-300 ${enabled[constraint.id] ? 'left-6.5' : 'left-0.5'
                                    }`}
                            ></div>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}