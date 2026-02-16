"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toLocalDateKey } from '@/lib/date';

interface DatePickerFormProps {
    onSelect?: (dateKey: string) => void;
}

export function DatePickerForm({ onSelect }: DatePickerFormProps) {
    const router = useRouter();
    const todayKey = toLocalDateKey(new Date());
    const [value, setValue] = useState<string>(todayKey);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dateKey = value;
        if (onSelect) onSelect(dateKey);
        // Navigate to calendar page with date param as a convenience
        router.push(`/calendar?date=${encodeURIComponent(dateKey)}`);
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <label className="sr-only">Pick date</label>
            <input
                type="date"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-white/5 border border-white/6 rounded px-2 py-1 text-sm text-white"
            />
            <button type="submit" className="px-3 py-1 bg-indigo-500/90 rounded text-sm text-white">Load</button>
        </form>
    );
}
