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
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Estimated Effort</h2>
                <button className="p-2 hover:bg-white/5 rounded-lg transition-all" aria-label="Edit effort">
                    <Edit2 className="w-4 h-4 text-slate-400" />
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