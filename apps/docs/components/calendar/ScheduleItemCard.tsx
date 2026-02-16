// components/schedule/ScheduleItemCard.tsx
interface ScheduleItem {
    id: number | string;
    type: string;
    title: string;
    time: string;
    subtitle?: string;
    location?: string;
    badge?: string;
    progress?: number;
    color: string;
}

interface ScheduleItemCardProps {
    item: ScheduleItem;
}

const colorStyles: Record<string, { border: string; accent: string; bg: string; badge: string }> = {
    blue: {
        border: 'border-l-blue-500',
        accent: 'text-blue-400',
        bg: 'bg-blue-500/10',
        badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    orange: {
        border: 'border-l-orange-500',
        accent: 'text-orange-400',
        bg: 'bg-orange-500/10',
        badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    },
    purple: {
        border: 'border-l-purple-500',
        accent: 'text-purple-400',
        bg: 'bg-purple-500/10',
        badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
    gray: {
        border: 'border-l-slate-500',
        accent: 'text-slate-400',
        bg: 'bg-slate-500/10',
        badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    },
};

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import DurationSelect from '@/components/ui/DurationSelect';

export function ScheduleItemCard({ item }: ScheduleItemCardProps) {
    const styles = colorStyles[item.color];
    const router = useRouter();
    const [selectedDuration, setSelectedDuration] = useState<number>(25);

    return (
        <div
            className={`relative bg-white/5 backdrop-blur-sm border-l-4 ${styles?.border} border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer group`}
        >
            <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg">{item.title}</h3>
                <span className={`text-sm font-semibold ${styles?.accent}`}>
                    {item.time}
                </span>
            </div>

            {item.location && (
                <p className="text-sm text-slate-400 mb-2">{item.location}</p>
            )}

            {item.subtitle && (
                <p className={`text-sm ${item.type === 'free' ? 'text-slate-500 italic' : 'text-slate-400'}`}>
                    {item.subtitle}
                </p>
            )}

            {item.badge && (
                <div className="mt-3">
                    <span className={`inline-block px-3 py-1 border rounded-lg text-xs font-semibold ${styles?.badge}`}>
                        {item.badge}
                    </span>
                </div>
            )}

            {item.progress !== undefined && (
                <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Progress</span>
                        <span className="text-xs font-semibold text-orange-400">{item.progress}% Complete</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-3">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                            style={{ width: `${item.progress}%` }}
                        ></div>
                    </div>

                    {/* Focus Button */}
                    <div className="mt-2 flex items-center gap-2">
                        <DurationSelect value={selectedDuration} onChange={setSelectedDuration} className="w-28" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/focus-session?task=${encodeURIComponent(item.title)}&duration=${selectedDuration}`);
                            }}
                            className="flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors text-slate-300 hover:text-white"
                        >
                            <span>Start Focus</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}