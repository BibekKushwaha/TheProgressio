// app/schedule/page.tsx
'use client';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { ScheduleDetailPanel } from '@/components/calendar/ScheduleDetailPanel';
import { UpcomingTasksPanel } from '@/components/calendar/UpcomingTasksPanel';
import { DayGrid } from '@/components/calendar/DayGrid';
import { useState, useEffect } from 'react';
import { useResolveRotationQuery } from '@repo/store';
import { RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { normalizeDateInput } from '@/lib/date';

export default function CalendarPage() {
    const [selectedView, setSelectedView] = useState('Month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDailyDetail, setShowDailyDetail] = useState(false);
    const [rotationFilter, setRotationFilter] = useState(false);
    const { data: rotation } = useResolveRotationQuery();

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
        if (!Number.isNaN(parsed.getTime())) {
            setSelectedDate(parsed);
        }
    }, [searchParams]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white p-6 md:p-8">
            <div className="max-w-[1600px] mx-auto">
                <CalendarHeader
                    selectedView={selectedView}
                    setSelectedView={handleViewChange}
                    currentDate={selectedDate}
                    onDateChange={setSelectedDate}
                />

                {/* Rotation Indicator + Filter Toggle */}
                {rotation && (
                    <div className="flex items-center gap-3 mt-4 px-4 py-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                        <RotateCcw className="w-5 h-5 text-violet-400" />
                        <span className="text-sm text-slate-300">
                            Today&apos;s Rotation: <span className="font-bold text-violet-300">{rotation.rotation || rotation.pattern?.name || 'Active'}</span>
                        </span>
                        <button
                            onClick={() => setRotationFilter(!rotationFilter)}
                            className={`ml-auto px-3 py-1 rounded-lg text-xs font-semibold transition-all ${rotationFilter
                                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                                    : 'bg-white/5 text-violet-400 hover:bg-violet-500/20'
                                }`}
                        >
                            {rotationFilter ? '✓ Filtering Active' : 'Filter by Rotation'}
                        </button>
                        <Link href="/advanced" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                            Manage →
                        </Link>
                    </div>
                )}

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