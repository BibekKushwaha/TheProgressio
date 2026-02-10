// components/calendar/DeadlineChip.tsx
import { Check } from 'lucide-react';

interface DeadlineChipProps {
    label: string;
    title: string;
    checkbox?: boolean;
}

export function DeadlineChip({ label, title, checkbox }: DeadlineChipProps) {
    return (
        <div className="flex items-center gap-4 mr-4">
            <div className="flex-1 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all duration-300 cursor-pointer">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-red-400 mb-1">{label}</div>
                        <div className="text-sm font-semibold">{title}</div>
                    </div>
                    {checkbox && (
                        <div className="w-6 h-6 border-2 border-white/20 rounded hover:border-purple-500 transition-all cursor-pointer"></div>
                    )}
                </div>
            </div>
        </div>
    );
}