// components/calendar/MiniCalendar.tsx
import { useMemo } from 'react';

export function MiniCalendar() {
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const { monthLabel, weeks, today } = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const todayDate = now.getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const cells: number[] = [];
        // Previous month's trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            cells.push(-(daysInPrevMonth - i)); // negative = outside month
        }
        // Current month
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push(d);
        }
        // Pad to fill last week
        while (cells.length % 7 !== 0) {
            cells.push(-(cells.length - daysInMonth - firstDay + 1));
        }
        // Take first 2 weeks starting from the week containing today
        const todayIndex = cells.indexOf(todayDate);
        const weekStart = Math.floor(todayIndex / 7) * 7;
        const visibleCells = cells.slice(weekStart, weekStart + 14);
        const weekRows = [visibleCells.slice(0, 7), visibleCells.slice(7, 14)];

        return {
            monthLabel: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            weeks: weekRows,
            today: todayDate,
        };
    }, []);

    return (
        <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <h3 className="text-lg font-bold mb-4">{monthLabel}</h3>

            <div className="grid grid-cols-7 gap-2 mb-2">
                {daysOfWeek.map((day, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-slate-500">
                        {day}
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-2">
                        {week.map((date, dateIndex) => {
                            const isSelected = date === today;
                            const isOutsideMonth = date <= 0;
                            const displayDate = isOutsideMonth ? Math.abs(date) : date;

                            return (
                                <button
                                    key={dateIndex}
                                    className={`aspect-square rounded-lg text-sm font-semibold transition-all duration-300 ${isSelected
                                            ? 'bg-purple-600 text-white shadow-lg'
                                            : isOutsideMonth
                                                ? 'text-slate-600 hover:bg-white/5'
                                                : 'text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    {displayDate}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}