import { Calendar, Clock, BookOpen, LucideIcon } from 'lucide-react';

interface MetaChipProps {
    label: string;
    value?: string;
    icon: LucideIcon;
    color: string;
}

interface MetaChipsProps {
    subject?: string;
    date?: string;
    time?: string;
    subjectColor?: string;
}

export function MetaChips({ subject, date, time, subjectColor }: MetaChipsProps) {
    const chips: MetaChipProps[] = [
        ...(subject ? [{
            label: 'Subject',
            value: subject,
            icon: BookOpen,
            color: subjectColor || 'from-purple-600 to-purple-500'
        }] : []),
        ...(date ? [{ label: 'Date', value: date, icon: Calendar, color: 'from-pink-600 to-pink-500' }] : []),
        ...(time ? [{ label: 'Time', value: time, icon: Clock, color: 'from-pink-600 to-pink-500' }] : []),
    ];

    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2.5">
            {chips.map((chip, index) => (
                <div
                    key={chip.label}
                    className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${chip.color} rounded-xl border border-white/20 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300 hover:scale-105 transition-transform`}
                    style={{ animationDelay: `${index * 50}ms` }}
                >
                    <chip.icon className="w-4 h-4 text-white" />
                    <span className="text-sm font-semibold text-white">{chip.value}</span>
                </div>
            ))}
        </div>
    );
}