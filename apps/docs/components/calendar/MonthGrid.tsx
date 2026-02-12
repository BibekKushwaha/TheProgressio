// components/schedule/MonthGrid.tsx
'use client';

import { useState } from 'react';
import { DayCell } from './Daycell';
import { useGetMonthlyEventsQuery } from '@repo/store';

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

    const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month: number, year: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust for Mon start (0=Mon, 6=Sun) or standard (0=Sun)
        // standard JS getDay(): 0=Sun, 1=Mon.
        // If we want Mon start: Mon=0 -> (1-1)=0. Sun=6 -> (0-1)=-1 -> 6. 
        // Let's stick to standard Sunday start for now matching the header MON-SUN?
        // Header is MON, TUE... so we need Mon=0
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
            events: []
        });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayEvents = events?.[dateKey];
        const eventMarkers = [];
        if (dayEvents?.taskCount) eventMarkers.push('coding'); // simplified mapping
        if (dayEvents?.examCount) eventMarkers.push('physics');

        days.push({
            date: i,
            isCurrentMonth: true,
            isToday: false, // Calculate real today if needed
            events: eventMarkers
        });
    }

    // Next month padding to fill 35 or 42 slots
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ date: i, isCurrentMonth: false, events: [] });
    }

    return (
        <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-2xl p-6">
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
                        isSelected={day.date === selectedDate && day.isCurrentMonth}
                        onClick={() => day.isCurrentMonth && onDateSelect(day.date)}
                    />
                ))}
            </div>
        </div>
    );
}