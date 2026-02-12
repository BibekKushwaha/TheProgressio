
"use client"

import { useGetDailyScheduleQuery, TimetableEntry, Task } from "@repo/store";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import { getTodayDateKey, toLocalDateKey } from "@/lib/date";

type TimetableViewProps = {
    tasks?: Task[];
    date?: string;
};

export function TimetableView({ tasks = [], date }: TimetableViewProps) {
    const { data: schedule, isLoading, error } = useGetDailyScheduleQuery(date ? { date } : undefined);
    const selectedDateString = date || getTodayDateKey();
    const todaysTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;
        return toLocalDateKey(new Date(task.dueDate)) === selectedDateString;
    });

    const scheduleContent = (() => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-48 bg-white/5" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-32 rounded-xl bg-white/5" />
                        ))}
                    </div>
                </div>
            );
        }

        if (error || !schedule) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white/5 rounded-2xl border border-white/10">
                    <Calendar className="w-12 h-12 mb-4 opacity-50" />
                    <p>No schedule available for today.</p>
                </div>
            );
        }

        return (
            <>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-purple-400" />
                            Today&apos;s Schedule
                        </h2>
                        <p className="text-slate-400 mt-1">
                            {new Date(schedule.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            {schedule.rotation && <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30">Rotation {schedule.rotation}</span>}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedule.entries.length > 0 ? (
                        schedule.entries.map((entry) => (
                            <ClassCard key={entry.id} entry={entry} />
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center text-slate-500">
                            No classes scheduled for today.
                        </div>
                    )}
                </div>
            </>
        );
    })();

    return (
        <div className="space-y-6">
<<<<<<< HEAD
            {scheduleContent}
=======
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-purple-400" />
                        Today&apos;s Schedule
                    </h2>
                    <p className="text-slate-400 mt-1">
                        {new Date(schedule.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        {schedule.rotation && <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30">Rotation {schedule.rotation}</span>}
                    </p>
                </div>
            </div>
>>>>>>> origin/main

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Today&apos;s Tasks</h3>
                    <span className="text-xs text-slate-400">{todaysTasks.length} tasks</span>
                </div>
                {todaysTasks.length > 0 ? (
                    <div className="space-y-2">
                        {todaysTasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-white truncate">{task.title}</div>
                                    {task.description && (
                                        <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{task.description}</div>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 whitespace-nowrap">
                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500">No tasks due today.</div>
                )}
            </div>
        </div>
    );
}

function ClassCard({ entry }: { entry: TimetableEntry }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all group relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1`} style={{ backgroundColor: entry.subject.color || '#A855F7' }} />

            <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-white">{entry.subject.name}</h3>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-slate-300">
                    {entry.subject.code}
                </span>
            </div>

            <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
                </div>
                {entry.subject.room && (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-indigo-400" />
                        <span>Room {entry.subject.room}</span>
                    </div>
                )}
                {entry.subject.teacher && (
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-pink-400" />
                        <span>{entry.subject.teacher}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatTime(timeString?: string) {
    if (!timeString) return '';
    // Assuming timeString is in "HH:mm" format
    const [hours, minutes] = timeString.split(':');
    if (!hours || !minutes) return timeString;
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
