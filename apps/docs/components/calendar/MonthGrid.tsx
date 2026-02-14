// components/schedule/MonthGrid.tsx
'use client';

import { DayCell } from './Daycell';
import { useGetMonthlyEventsQuery, useGetHolidaysQuery, type SchoolHoliday } from '@repo/store';

const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface MonthGridProps {
    selectedDate: number;
    onDateSelect: (date: number) => void;
    currentMonth: number;
    currentYear: number;
    rotationFilter?: boolean;
    rotation?: unknown;
}

export function MonthGrid({ selectedDate, onDateSelect, currentMonth, currentYear }: MonthGridProps) {
    const { data: events } = useGetMonthlyEventsQuery({ month: currentMonth + 1, year: currentYear });
    const { data: holidayData } = useGetHolidaysQuery();

    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month: number, year: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Mon start (0=Mon, 6=Sun) or standard (0=Sun)
    };

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear); // 0=Mon

    // Generate calendar days
    const days = [];

    // Prev month padding
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
    for (let i = 0; i < firstDay; i++) {
        days.push({
            date: prevMonthDays - firstDay + 1 + i,
            isCurrentMonth: false,
            events: [],
            isHoliday: false
        });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayEvents = events?.[dateKey];
        const eventMarkers = [];
        if (dayEvents?.taskCount) eventMarkers.push('coding'); // simplified mapping
        if (dayEvents?.examCount) eventMarkers.push('physics');

        // Check for holiday
        const currentDate = new Date(currentYear, currentMonth, i);
        // Normalize to start of day for comparison
        currentDate.setHours(0, 0, 0, 0);

        const isHoliday = holidayData?.holidays?.some((h: SchoolHoliday) => {
            const start = new Date(h.startDate);
            const end = new Date(h.endDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return currentDate >= start && currentDate <= end;
        });

        days.push({
            date: i,
            isCurrentMonth: true,
            isToday: false, // Calculate real today if needed
            events: eventMarkers,
            isHoliday: !!isHoliday
        });
    }

    // Next month padding to fill 35 or 42 slots
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ date: i, isCurrentMonth: false, events: [], isHoliday: false });
    }

    return (
        <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="text-xs flex gap-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>Exam</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span>Task</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30"></div>
                        <span>Holiday</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-4 mb-4">
                {daysOfWeek.map((day) => (
                    <div key={day} className="text-center text-sm font-semibold text-slate-400">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-4">
                {days.map((day, index) => (
                    <DayCell
                        key={index}
                        date={day.date}
                        events={day.events}
                        isCurrentMonth={day.isCurrentMonth}
                        isToday={day.isToday}
                        isHoliday={day.isHoliday}
                        isSelected={day.date === selectedDate && day.isCurrentMonth}
                        onClick={() => day.isCurrentMonth && onDateSelect(day.date)}
                    />
                ))}
            </div>
        </div>
    );
}
