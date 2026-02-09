"use client";
import React from 'react';
import { Sparkles, Calendar } from 'lucide-react';
import { ScheduleItemCard } from './SheduelItemCard';
import { AiSuggestedDialog } from './AiSuggestedDialog';
import { useGetCalendarDailyScheduleQuery } from '@repo/store';

interface ScheduleDetailPanelProps {
    date: Date;
}

export function ScheduleDetailPanel({ date }: ScheduleDetailPanelProps) {
    const dateString = date.toISOString().split('T')[0] || '';
    const { data: schedule } = useGetCalendarDailyScheduleQuery({ date: dateString });
    // Verify type: schedule is DailyScheduleResponse | undefined

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-1 text-white">Schedule Detail</h2>
                        <p className="text-purple-400 font-semibold">
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="mb-6">
                    <AiSuggestedDialog />
                </div>

                <div className="space-y-4">
                    {(!schedule?.items || schedule.items.filter(i => i.type === 'task' || i.type === 'exam').length === 0) && (
                        <div className="text-center text-slate-400 py-4">No tasks or exams for this day.</div>
                    )}

                    {schedule?.items
                        ?.filter(i => i.type === 'task' || i.type === 'exam')
                        .map((item) => (
                            <ScheduleItemCard
                                key={item.id}
                                item={{
                                    id: String(item.id), // Ensure string if needed
                                    type: item.type,
                                    title: item.title,
                                    time: item.startTime === '00:00' ? 'All Day' : `${item.startTime} - ${item.endTime}`,
                                    subtitle: item.subtitle,
                                    location: item.location || '',
                                    progress: item.isCompleted ? 100 : 0,
                                    color: item.color || 'blue' // Default color
                                }}
                            />
                        ))}
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-indigo-200">Upcoming Classes</h3>
                <div className="space-y-3">
                    {schedule?.items
                        ?.filter(i => i.type === 'class')
                        .map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                                    {item.subject?.substring(0, 2) || 'CL'}
                                </div>
                                <div>
                                    <div className="font-medium text-white text-sm">{item.title}</div>
                                    <div className="text-xs text-slate-400">{item.startTime} • {item.subtitle}</div>
                                </div>
                            </div>
                        ))}
                    {schedule?.items.filter(i => i.type === 'class').length === 0 && (
                        <div className="text-center text-slate-400 py-2 text-sm">No classes today.</div>
                    )}
                </div>
            </div>
        </div>
    );
}