// components/calendar/MonthGrid.tsx
'use client';

import { useMemo } from 'react';
import { DayCell } from './Daycell';
import { useGetMonthlyEventsQuery, useGetHolidaysQuery, type SchoolHoliday } from '@repo/store';
import { getTodayDateKey } from '@/lib/date';

const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Pure helpers — module-level so they are not recreated on every render.
function getDaysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(month: number, year: number) {
    // Returns 0=Mon … 6=Sun
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
}

interface MonthGridProps {
    selectedDate: number;
    onDateSelect: (date: number) => void;
    currentMonth: number;
    currentYear: number;
    rotationFilter?: boolean;
}

export function MonthGrid({ selectedDate, onDateSelect, currentMonth, currentYear, rotationFilter: _rotationFilter = false }: MonthGridProps) {
    const { data: events } = useGetMonthlyEventsQuery({ month: currentMonth + 1, year: currentYear });
    const { data: holidayData } = useGetHolidaysQuery();

    // Pre-compute holiday ranges once per holidayData update — O(H) instead of O(D×H).
    const holidayRanges = useMemo(() =>
        (holidayData?.holidays ?? []).map((h: SchoolHoliday) => ({
            start: new Date(h.startDate).setHours(0, 0, 0, 0),
            end:   new Date(h.endDate).setHours(23, 59, 59, 999),
        })),
        [holidayData]
    );

    const todayKey = getTodayDateKey();

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear); // 0=Mon

    // Generate calendar days
    const days = [];

    // Prev month padding
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
    for (let i = 0; i < firstDay; i++) {
        days.push({
            key: `prev-${i}`,
            date: prevMonthDays - firstDay + 1 + i,
            isCurrentMonth: false,
            events: [],
            isHoliday: false,
            isExam: false,
        });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayEvents = events?.[dateKey];
        const eventMarkers: string[] = [];
        if (dayEvents?.taskCount) eventMarkers.push('task');
        if (dayEvents?.examCount) eventMarkers.push('exam');

        const dateMs = new Date(currentYear, currentMonth, i).setHours(0, 0, 0, 0);
        const isHoliday = holidayRanges.some(r => dateMs >= r.start && dateMs <= r.end);

        days.push({
            key: `cur-${i}`,
            date: i,
            isCurrentMonth: true,
            isToday: dateKey === todayKey,
            events: eventMarkers,
            isHoliday,
            isExam: !!dayEvents?.examCount,
        });
    }

    // Next month padding to fill 35 or 42 slots
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ key: `next-${i}`, date: i, isCurrentMonth: false, events: [], isHoliday: false, isExam: false });
    }

    return (
        <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="text-xs flex gap-4 text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>Exam Event</span>
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
                {days.map((day) => (
                    <DayCell
                        key={day.key}
                        date={day.date}
                        events={day.events}
                        isCurrentMonth={day.isCurrentMonth}
                        isToday={day.isToday}
                        isHoliday={day.isHoliday}
                        isExam={day.isExam}
                        isSelected={day.date === selectedDate && day.isCurrentMonth}
                        onClick={() => day.isCurrentMonth && onDateSelect(day.date)}
                    />
                ))}
            </div>
        </div>
    );
}
