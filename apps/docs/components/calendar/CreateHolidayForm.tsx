"use client";
import React, { useState } from 'react';
import { useCreateHolidayMutation } from '@repo/store';
import { useToast } from '../ui/toast-provider';

interface Holiday {
    id: string;
    name: string;
    startDate: string | Date;
    endDate: string | Date;
    pauseNotifications?: boolean;
}

interface CreateHolidayFormProps {
    defaultDate?: string;
    onCreated?: (holiday?: Holiday) => Promise<unknown> | void;
}

export default function CreateHolidayForm({ defaultDate, onCreated }: CreateHolidayFormProps) {
    const [name, setName] = useState('Test Holiday');
    const [startDate, setStartDate] = useState(defaultDate ?? '');
    const [endDate, setEndDate] = useState(defaultDate ?? '');
    const [pauseNotifications, setPauseNotifications] = useState(true);

    const [createHoliday, { isLoading, error }] = useCreateHolidayMutation();
    const [showToast, setShowToast] = React.useState(false);
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Toast component imported above

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const res = await createHoliday({ name, startDate, endDate, pauseNotifications }).unwrap();
            // notify success
            toast.toast('Holiday created', 'success');
            // pass created holiday back to parent for optimistic UI
            if (res && res.holiday) {
                onCreated?.(res.holiday);
            } else {
                onCreated?.();
            }
            // Await parent refetch or any post-create action if provided
            try {
                const maybe = onCreated?.();
                await Promise.resolve(maybe);
            } catch {
                void 0; // intentionally ignore refetch errors
            }
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            console.error('CreateHolidayForm submit error', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex gap-2">
                <input
                    className="flex-1 rounded-md border px-2 py-1 bg-white/5 text-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Holiday name"
                    disabled={isSubmitting}
                />
            </div>

            <div className="flex gap-2">
                <input
                    type="date"
                    className="rounded-md border px-2 py-1 bg-white/5 text-white"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    disabled={isSubmitting}
                />
                <input
                    type="date"
                    className="rounded-md border px-2 py-1 bg-white/5 text-white"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    disabled={isSubmitting}
                />
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={pauseNotifications} onChange={(e) => setPauseNotifications(e.target.checked)} />
                Pause notifications
            </label>

            <div className="flex items-center gap-2">
                <button type="submit" disabled={isSubmitting || isLoading} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">
                    {isSubmitting || isLoading ? 'Creating…' : 'Create Holiday'}
                </button>
                {error && <div className="text-sm text-red-400">Error creating holiday</div>}
            </div>

            {showToast && null}
        </form>
    );
}
