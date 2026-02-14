// components/schedule/DayCell.tsx
interface DayCellProps {
    date: number;
    events: string[];
    isCurrentMonth: boolean;
    isToday?: boolean;
    isHoliday?: boolean;
    isSelected: boolean;
    onClick: () => void;
}

const eventColors: Record<string, string> = {
    physics: 'bg-blue-500',
    history: 'bg-orange-500',
    coding: 'bg-purple-500',
};

export function DayCell({ date, events, isCurrentMonth, isToday, isHoliday, isSelected, onClick }: DayCellProps) {
    return (
        <button
            onClick={onClick}
            className={`relative aspect-[4/3] rounded-xl border transition-all duration-300 ${!isCurrentMonth
                ? 'bg-white/0 border-white/5 text-slate-600'
                : isToday || isSelected
                    ? 'bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border-purple-500 shadow-lg shadow-purple-500/20'
                    : isHoliday
                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                }`}
        >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={`text-xl font-semibold ${!isCurrentMonth ? 'text-slate-600' : 'text-white'}`}>
                    {date}
                </span>
            </div>

            {events.length > 0 && isCurrentMonth && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                    {events.map((event, index) => (
                        <div
                            key={index}
                            className={`w-1.5 h-1.5 rounded-full ${eventColors[event]}`}
                        ></div>
                    ))}
                </div>
            )}
        </button>
    );
}