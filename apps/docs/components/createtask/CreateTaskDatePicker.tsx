'use client';

import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CreateTaskDatePickerProps {
    value: string;
    onChange: (nextDate: string) => void;
    placeholder?: string;
    className?: string;
}

function parseDateKey(dateKey: string): Date | undefined {
    if (!dateKey) return undefined;
    const [year, month, day] = dateKey.split('-').map(Number);
    if (!year || !month || !day) return undefined;
    const dt = new Date(year, month - 1, day);
    return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function CreateTaskDatePicker({
    value,
    onChange,
    placeholder = 'Select date',
    className = '',
}: CreateTaskDatePickerProps) {
    const [open, setOpen] = useState(false);
    const selectedDate = useMemo(() => parseDateKey(value), [value]);
    const label = selectedDate
        ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : placeholder;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={`w-full h-12 px-3 rounded-xl border border-white/10 bg-white/5 text-left text-sm transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${className}`}
                >
                    <span className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-slate-300" />
                        <span className={selectedDate ? 'text-white' : 'text-slate-400'}>{label}</span>
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-white/10 bg-transparent shadow-none" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                        if (!date) return;
                        onChange(formatDateKey(date));
                        setOpen(false);
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}
