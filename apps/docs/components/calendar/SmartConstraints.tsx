// components/configure-study/SmartConstraints.tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

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

export type SmartConstraintId = typeof constraints[number]['id'];
export type SmartConstraintsValue = Record<SmartConstraintId, boolean>;

const defaultConstraintsState: SmartConstraintsValue = {
    'avoid-back-to-back': true,
    'prioritize-morning': true,
};

interface SmartConstraintsProps {
    value?: SmartConstraintsValue;
    onChange?: (value: SmartConstraintsValue) => void;
    className?: string;
}

export function SmartConstraints({ value, onChange, className }: SmartConstraintsProps) {
    const [enabled, setEnabled] = useState<SmartConstraintsValue>(defaultConstraintsState);
    const current = value ?? enabled;

    const toggle = (id: SmartConstraintId) => {
        const next: SmartConstraintsValue = { ...current, [id]: !current[id] };
        if (value === undefined) {
            setEnabled(next);
        }
        onChange?.(next);
    };

    return (
        <div className={className}>
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
                            type="button"
                            onClick={() => toggle(constraint.id)}
                            className={cn(
                                "relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ml-4",
                                current[constraint.id] ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-slate-700'
                            )}
                            aria-label={`Toggle ${constraint.title}`}
                        >
                            <div
                                className={cn(
                                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300",
                                    current[constraint.id] ? 'translate-x-6' : 'translate-x-0'
                                )}
                            ></div>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
