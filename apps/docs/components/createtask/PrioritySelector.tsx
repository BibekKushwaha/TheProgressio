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
        <div>
            <h2 className="text-lg font-bold text-white mb-4">Priority Level</h2>
            <OptionSelector
                options={priorities}
                selected={selectedPriority}
                onSelect={onSelect}
            />
        </div>
    );
}