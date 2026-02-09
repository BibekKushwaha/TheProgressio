// components/calendar/MiniCalendar.tsx
export function MiniCalendar() {
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dates = [
        [29, 30, 1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10, 11, 12],
    ];

    return (
        <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <h3 className="text-lg font-bold mb-4">November 2023</h3>

            <div className="grid grid-cols-7 gap-2 mb-2">
                {daysOfWeek.map((day, i) => (
                    <div key={i} className="text-center text-xs font-semibold text-slate-500">
                        {day}
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                {dates.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-2">
                        {week.map((date, dateIndex) => {
                            const isSelected = date === 7;
                            const isOutsideMonth = date > 20;

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
                                    {date}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}