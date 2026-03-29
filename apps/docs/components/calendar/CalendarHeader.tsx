// components/calendar/CalendarHeader.tsx
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import CreateHolidayForm from './CreateHolidayForm';
import { toLocalDateKey } from '@/lib/date';

const views = ['Day', 'Month'];

interface CalendarHeaderProps {
    selectedView: string;
    setSelectedView: (view: string) => void;
    currentDate: Date;
    onDateChange: (date: Date) => void;
}

export function CalendarHeader({ selectedView, setSelectedView, currentDate, onDateChange }: CalendarHeaderProps) {
    const [holidayOpen, setHolidayOpen] = useState(false);

    const handlePrevious = () => {
        const newDate = new Date(currentDate);
        if (selectedView === 'Day') {
            newDate.setDate(newDate.getDate() - 1);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        onDateChange(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (selectedView === 'Day') {
            newDate.setDate(newDate.getDate() + 1);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        onDateChange(newDate);
    };

    const previousDate = new Date(currentDate);
    const nextDate = new Date(currentDate);
    if (selectedView === 'Day') {
        previousDate.setDate(previousDate.getDate() - 1);
        nextDate.setDate(nextDate.getDate() + 1);
    } else {
        previousDate.setMonth(previousDate.getMonth() - 1, 1);
        nextDate.setMonth(nextDate.getMonth() + 1, 1);
    }

    const previousLabel = selectedView === 'Day'
        ? previousDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : previousDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const nextLabel = selectedView === 'Day'
        ? nextDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : nextDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // 'Today' action was removed from UI; handler not required

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold">{selectedView}</h1>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">Synced</span>
                    </div>
                </div>
                <p className="text-slate-400 text-lg">{currentDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    year: 'numeric'
                })}</p>
            </div>

            <div className="flex items-center gap-3">
                <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
                    <DialogTrigger asChild>
                        <button
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
                        >
                            Holiday
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Holiday</DialogTitle>
                        </DialogHeader>
                        <div>
                            <CreateHolidayForm defaultDate={toLocalDateKey(currentDate)} onCreated={() => setHolidayOpen(false)} />
                        </div>
                        <DialogFooter />
                    </DialogContent>
                </Dialog>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrevious}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300"
                        aria-label={selectedView === 'Day' ? 'Previous day' : 'Previous month'}
                        title={`Go to previous ${selectedView === 'Day' ? 'day' : 'month'} (${previousLabel})`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300"
                        aria-label={selectedView === 'Day' ? 'Next day' : 'Next month'}
                        title={`Go to next ${selectedView === 'Day' ? 'day' : 'month'} (${nextLabel})`}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                    {views.map((view) => (
                        <button
                            key={view}
                            onClick={() => setSelectedView(view)}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${selectedView === view
                                ? 'bg-linear-to-r from-purple-600 to-indigo-600 shadow-lg'
                                : 'hover:bg-white/5'
                                }`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
