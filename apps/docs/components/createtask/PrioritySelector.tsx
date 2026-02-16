// components/create-task/PrioritySelector.tsx
'use client';

import { OptionSelector } from '../ui/OptionSelector';

const priorities = ['Routine', 'Medium', 'Urgent'];

interface PrioritySelectorProps {
    selectedPriority: string;
    onSelect: (priority: string) => void;
}

export function PrioritySelector({ selectedPriority, onSelect }: PrioritySelectorProps) {
    return (
        <div className="space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full"></span>
                Priority Level
            </h2>
            <OptionSelector
                options={priorities}
                selected={selectedPriority}
                onSelect={onSelect}
            />
        </div>
    );
}