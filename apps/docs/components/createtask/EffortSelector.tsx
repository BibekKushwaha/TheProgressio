// components/create-task/EffortSelector.tsx
'use client';

import { Edit2 } from 'lucide-react';
import { OptionSelector } from '../ui/OptionSelector';

const efforts = ['30m', '1h', '2h+'];

interface EffortSelectorProps {
    selectedEffort: string;
    onSelect: (effort: string) => void;
}

export function EffortSelector({ selectedEffort, onSelect }: EffortSelectorProps) {

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-5 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></span>
                    Estimated Effort
                </h2>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-all" aria-label="Edit effort">
                    <Edit2 className="w-4 h-4 text-slate-400 hover:text-slate-300" />
                </button>
            </div>

            <OptionSelector
                options={efforts}
                selected={selectedEffort}
                onSelect={onSelect}
            />
        </div>
    );
}