"use client";
import React from 'react';
import { ScheduleItemCard } from './ScheduleItemCard';
import { AiSuggestedDialog } from './AiSuggestedDialog';
import { useGetCalendarDailyScheduleQuery } from '@repo/store';
import { toLocalDateKey } from '@/lib/date';
import { mapCalendarScheduleItems, MappedCalendarItem } from '@/lib/schedule';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ScheduleDetailPanelProps {
    date: Date;
}


function ClassList({ items }: { items: MappedCalendarItem[] }) {
    if (!items.length) {
        return <div className="text-center text-slate-400 py-2 text-sm">No classes today.</div>;
    }
    return (
        <>
            {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                        {item.kind === 'class' ? (item.subject?.substring(0, 2) ?? 'CL') : 'CL'}
                    </div>
                    <div>
                        <div className="font-medium text-white text-sm">{item.title}</div>
                        <div className="text-xs text-slate-400">
                            {item.startTime} • {item.kind === 'class' ? item.room : ''}
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}

export function ScheduleDetailPanel({ date }: ScheduleDetailPanelProps) {
    const dateString = toLocalDateKey(date);
    const { data: schedule, isLoading, error } = useGetCalendarDailyScheduleQuery({ date: dateString });

    const mappedItems = mapCalendarScheduleItems(schedule?.items);
    const nonClassItems = mappedItems.filter(i => i.kind === 'task' || i.kind === 'exam');
    const classItems = mappedItems.filter(i => i.kind === 'class');

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-0 text-white">Schedule Detail</h2>
                        <p className="text-purple-400 font-semibold mt-2">
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="mb-6">
                    <AiSuggestedDialog />
                </div>

                {/* Holiday creation moved to header dialog */}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                        <p className="text-sm">Loading details...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-red-500/5 border border-red-500/20 rounded-xl text-center">
                        <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
                        <h4 className="text-white font-medium mb-1">Failed to load items</h4>
                        <p className="text-slate-400 text-sm">There was a problem reaching the calendar service.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {nonClassItems.length === 0 && (
                            <div className="text-center text-slate-400 py-4">No tasks or exams for this day.</div>
                        )}

                        {nonClassItems.map((item) => (
                            <ScheduleItemCard
                                key={item.id}
                                item={{
                                    id: item.id,
                                    type: item.kind,
                                    title: item.title,
                                    time: item.startTime === '00:00' ? 'All Day' : `${item.startTime} - ${item.endTime}`,
                                    subtitle: (item.kind === 'task' ? item.subtitle : item.kind === 'exam' ? item.location : undefined) || undefined,
                                    location: item.kind === 'exam' ? item.location || '' : '',
                                    progress: item.kind === 'task' && item.isCompleted ? 100 : 0,
                                    color: item.color
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-indigo-200">Upcoming Classes</h3>
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center text-slate-400 py-2 text-sm flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin outline-none" /> Loading classes...
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-400 py-2 text-sm bg-red-500/10 rounded-lg">Error loading classes.</div>
                    ) : (
                        <ClassList items={classItems} />
                    )}
                </div>
            </div>
            {/* Conflicts */}
            {schedule?.conflicts && schedule.conflicts.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                    <h4 className="text-sm font-semibold text-red-300 mb-2">Scheduling Conflicts</h4>
                    <ul className="text-xs text-red-200 space-y-1">
                        {schedule.conflicts.map((c) => (
                            <li key={c.id}>{c.message} — {c.startsAt} to {c.endsAt}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}