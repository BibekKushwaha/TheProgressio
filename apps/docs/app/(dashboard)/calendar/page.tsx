// app/schedule/page.tsx
'use client';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { MonthGrid } from '@/components/calendar/MonthGrid';
import { ScheduleDetailPanel } from '@/components/calendar/ScheduleDetailPanel';
import { UpcomingTasksPanel } from '../../../components/calendar/UpcomingTasksPanel';
import { DayGrid } from '@/components/calendar/DayGrid';
import { useState } from 'react';
import { useResolveRotationQuery } from '@repo/store';
import { CalendarDays, Filter, LayoutGrid, RotateCcw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { toLocalDateKey } from '@/lib/date';
import { GlassHero } from '@/components/layout/GlassHero';
import { HeroStatsGrid } from '@/components/layout/HeroStatsGrid';

export default function CalendarPage() {
    const [selectedView, setSelectedView] = useState('Month');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDailyDetail, setShowDailyDetail] = useState(false);
    const [rotationFilter, setRotationFilter] = useState(false);
    const selectedDateKey = toLocalDateKey(selectedDate);
    const { data: rotation } = useResolveRotationQuery(
        { date: selectedDateKey },
        { refetchOnMountOrArgChange: true }
    );
    const selectedDateLabel = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
    const rotationLabel = rotation?.rotation || rotation?.pattern?.name || 'Not set';

    const handleViewChange = (view: string) => {
        setSelectedView(view);
        if (view === 'Day') {
            setShowDailyDetail(true);
        } else {
            setShowDailyDetail(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white p-4 md:p-8">
            <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
            <div className="max-w-[1600px] mx-auto">
                <GlassHero className="mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-xs text-slate-300 mb-4">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                        Smart Calendar Workspace
                    </div>

                    <CalendarHeader
                        selectedView={selectedView}
                        setSelectedView={handleViewChange}
                        currentDate={selectedDate}
                        onDateChange={setSelectedDate}
                    />

                    <HeroStatsGrid
                        className="mt-6"
                        items={[
                            {
                                id: 'selected-date',
                                label: 'Selected Date',
                                value: selectedDateLabel,
                                icon: <CalendarDays className="w-3.5 h-3.5 text-cyan-300" />,
                            },
                            {
                                id: 'current-view',
                                label: 'Current View',
                                value: selectedView,
                                icon: <LayoutGrid className="w-3.5 h-3.5 text-fuchsia-300" />,
                            },
                            {
                                id: 'rotation',
                                label: 'Rotation',
                                value: rotationLabel,
                                icon: <RotateCcw className="w-3.5 h-3.5 text-violet-300" />,
                            },
                            {
                                id: 'filter-mode',
                                label: 'Filter Mode',
                                value: rotationFilter ? 'Rotation only' : 'All events',
                                icon: <Filter className="w-3.5 h-3.5 text-emerald-300" />,
                            },
                        ]}
                    />
                </GlassHero>

                {/* Rotation Indicator + Filter Toggle */}
                {rotation ? (
                    <div className="flex flex-wrap items-center gap-3 mt-4 px-4 py-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
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
                ) : (
                    <div className="flex items-center justify-between gap-3 mt-4 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl">
                        <span className="text-sm text-slate-300">No active rotation set for this date.</span>
                        <Link href="/advanced" className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors">
                            Set rotation →
                        </Link>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
                    <div className="xl:col-span-2">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white">Calendar Canvas</h2>
                                <p className="text-sm text-slate-400">
                                    {selectedView === 'Month' ? 'Browse monthly workload and jump into a day.' : 'Focus on hour-by-hour plan for this date.'}
                                </p>
                            </div>
                        </div>
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
                                rotationFilter={rotationFilter}
                                rotation={rotation}
                            />
                        )}
                        {selectedView === 'Day' && (
                            <DayGrid
                                date={selectedDate}
                                rotationFilter={rotationFilter}
                                rotation={rotation}
                            />
                        )}
                    </div>

                    <div>
                        <div className="mb-3">
                            <h2 className="text-lg font-bold text-white">
                                {selectedView === 'Month' && !showDailyDetail ? 'Upcoming Snapshot' : 'Day Details'}
                            </h2>
                            <p className="text-sm text-slate-400">
                                {selectedView === 'Month' && !showDailyDetail
                                    ? 'Quickly review what is coming next.'
                                    : 'Review classes, tasks, exams, and smart suggestions.'}
                            </p>
                        </div>
                        {selectedView === 'Month' && !showDailyDetail ? (
                            <UpcomingTasksPanel />
                        ) : (
                            <ScheduleDetailPanel
                                date={selectedDate}
                                rotationFilter={rotationFilter}
                                rotation={rotation}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
