// app/schedule/page.tsx
'use client';
import { CalendarHeader } from '@/components/clander/ClanderHeader';
import { MonthGrid } from '@/components/clander/MonthGrid';
import { ScheduleDetailPanel } from '@/components/clander/SheduleDetailPannel';
import { UpcomingTasksPanel } from '@/components/clander/UpcomingTasksPanel';
import { DayGrid } from '@/components/clander/DayGrid';
import { useState } from 'react';

export default function ClandarPage() {
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white p-6 md:p-8">
            <div className="max-w-[1600px] mx-auto">
                <CalendarHeader selectedView={selectedView} setSelectedView={handleViewChange} />

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