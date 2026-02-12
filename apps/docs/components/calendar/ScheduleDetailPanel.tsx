"use client";
import { useCallback, useMemo } from 'react';
import { ScheduleItemCard } from './ScheduleItemCard';
import { AiSuggestedDialog } from './AiSuggestedDialog';
import { useGetCalendarDailyScheduleQuery, ResolvedRotation } from '@repo/store';
import { BookOpen, ClipboardList, GraduationCap } from 'lucide-react';
import { toLocalDateKey } from '@/lib/date';
import { matchesRotationFilter } from '@/lib/rotation';

interface ScheduleDetailPanelProps {
    date: Date;
    rotationFilter?: boolean;
    rotation?: ResolvedRotation;
}

export function ScheduleDetailPanel({ date, rotationFilter = false, rotation }: ScheduleDetailPanelProps) {
    const dateString = toLocalDateKey(date);
    const { data: schedule } = useGetCalendarDailyScheduleQuery(
        { date: dateString },
        { refetchOnMountOrArgChange: true }
    );

    const matchesRotation = useCallback((itemRotation?: string | null) => {
        return matchesRotationFilter({
            rotationFilter,
            rotation,
            itemRotation,
        });
    }, [rotationFilter, rotation]);

    const taskAndExamItems = useMemo(
        () =>
            schedule?.items?.filter(
                (item) => (item.type === 'task' || item.type === 'exam') && matchesRotation(item.rotation)
            ) ?? [],
        [schedule?.items, matchesRotation]
    );

    const classItems = useMemo(
        () => schedule?.items?.filter((item) => item.type === 'class' && matchesRotation(item.rotation)) ?? [],
        [schedule?.items, matchesRotation]
    );

    const filteredScheduleItems = useMemo(
        () => schedule?.items?.filter((item) => matchesRotation(item.rotation)) ?? [],
        [schedule?.items, matchesRotation]
    );

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.06] via-purple-500/[0.04] to-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="absolute -top-14 -right-14 w-40 h-40 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-1 text-white">Schedule Detail</h2>
                        <p className="text-purple-400 font-semibold">
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                            <ClipboardList className="w-3.5 h-3.5 text-orange-300" />
                            Tasks & Exams
                        </div>
                        <p className="mt-1 text-lg font-semibold text-white">{taskAndExamItems.length}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-cyan-300" />
                            Classes
                        </div>
                        <p className="mt-1 text-lg font-semibold text-white">{classItems.length}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-xs uppercase tracking-wide text-slate-400">Rotation Mode</div>
                        <p className="mt-1 text-lg font-semibold text-white">{rotationFilter ? 'Filtered' : 'All'}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <AiSuggestedDialog date={date} scheduleItems={filteredScheduleItems} />
                </div>

                <div className="space-y-4">
                    {taskAndExamItems.length === 0 && (
                        <div className="text-center text-slate-400 py-4">No tasks or exams for this day.</div>
                    )}

                    {taskAndExamItems.map((item) => (
                        <ScheduleItemCard
                            key={item.id}
                            item={{
                                id: String(item.id),
                                type: item.type,
                                title: item.title,
                                time: item.startTime === '00:00' ? 'All Day' : `${item.startTime} - ${item.endTime}`,
                                subtitle: item.subtitle,
                                location: item.location || '',
                                progress: item.isCompleted ? 100 : 0,
                                color: item.color || 'blue'
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-indigo-200 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Upcoming Classes
                </h3>
                <div className="space-y-3">
                    {classItems
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
                    {classItems.length === 0 && (
                        <div className="text-center text-slate-400 py-2 text-sm">No classes today.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
