// app/schedule/page.tsx
'use client';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { ScheduleDetailPanel } from '@/components/calendar/ScheduleDetailPanel';
import { UpcomingTasksPanel } from '@/components/calendar/UpcomingTasksPanel';
import { DayGrid } from '@/components/calendar/DayGrid';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { normalizeDateInput } from '@/lib/date';

function CalendarContent() {
    const [selectedView, setSelectedView] = useState('Month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDailyDetail, setShowDailyDetail] = useState(false);

    const handleViewChange = (view: string) => {
        setSelectedView(view);
        if (view === 'Day') {
            setShowDailyDetail(true);
        } else {
            setShowDailyDetail(false);
        }
    };

    // Read optional `date` query param (YYYY-MM-DD) and apply it as local date
    const searchParams = useSearchParams();
    useEffect(() => {
        const dateParam = searchParams?.get?.('date');
        if (!dateParam) return;
        const normalized = normalizeDateInput(dateParam);
        if (!normalized) return;
        const parts = normalized.split('-');
        if (parts.length !== 3) return;
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return;
        // Construct a local Date (year, monthIndex, day)
        const parsed = new Date(y, m - 1, d);
        if (
            !Number.isNaN(parsed.getTime()) &&
            parsed.getFullYear() === y &&
            parsed.getMonth() === m - 1 &&
            parsed.getDate() === d
        ) {
            setSelectedDate(parsed);
        }
    }, [searchParams]);

    return (
        <div className="space-y-6">
            <div className="mx-auto">
                <CalendarHeader
                    selectedView={selectedView}
                    setSelectedView={handleViewChange}
                    currentDate={selectedDate}
                    onDateChange={setSelectedDate}
                />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
                    <div className="xl:col-span-2">
                        {selectedView === 'Month' && (
                            <MonthGrid
                                selectedDate={selectedDate.getDate()}
                                onDateSelect={(date) => {
                                    const newDate = new Date(selectedDate);
                                    newDate.setDate(date);
                                    setSelectedDate(newDate);
                                    setShowDailyDetail(true);
                                }}
                                currentMonth={selectedDate.getMonth()}
                                currentYear={selectedDate.getFullYear()}
                            />
                        )}
                        {selectedView === 'Day' && <DayGrid date={selectedDate} />}
                    </div>

                    <div>
                        {selectedView === 'Month' && !showDailyDetail ? (
                            <UpcomingTasksPanel />
                        ) : (
                            <ScheduleDetailPanel date={selectedDate} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div className="space-y-6" />}>
            <CalendarContent />
        </Suspense>
    );
}
