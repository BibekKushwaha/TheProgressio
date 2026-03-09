"use client"

import { useGetDailyScheduleQuery, TimetableEntry } from "@repo/store";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, AlertTriangle, MapPin, User, Edit3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RotationManager } from "./RotationManager";
import { ClassManager } from "./ClassManager";

export function TimetableView() {
    const { data: schedule, isLoading, error } = useGetDailyScheduleQuery();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Prevent hydration mismatch
    if (!isMounted) return null;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-6 w-96" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-[#1C1C21] rounded-2xl p-6 border border-red-500/20 shadow-xl flex flex-col items-center justify-center min-h-[200px] text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-white font-medium">Failed to load schedule</h3>
                <p className="text-slate-400 text-sm mt-1 mb-4">There was a problem retrieving today&apos;s timetable.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!schedule) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white/5 rounded-2xl border border-white/10">
                <Calendar className="w-12 h-12 mb-4 opacity-50" />
                <p>No schedule available for today.</p>
                <Dialog>
                    <DialogTrigger asChild>
                        <button className="mt-4 text-sm text-purple-400 hover:text-purple-300 underline font-medium">
                            Setup Rotation Pattern
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl bg-slate-900 border-white/10 text-white p-0 overflow-hidden">
                        <DialogHeader className="p-6 pb-0 sr-only">
                            <DialogTitle>Setup Rotation Pattern</DialogTitle>
                            <DialogDescription>Configure your study rotation patterns here.</DialogDescription>
                        </DialogHeader>
                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            <RotationManager />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-purple-400" />
                        Today&apos;s Schedule
                    </h2>
                    <p className="text-slate-400 mt-1">
                        {new Date(schedule.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        {schedule.rotation && <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs border border-purple-500/30">Rotation {schedule.rotation}</span>}
                        {schedule.isHoliday && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30">
                                Holiday {schedule.holidayName ? `• ${schedule.holidayName}` : ''}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-all">
                                <Edit3 className="w-4 h-4 text-indigo-400" />
                                Edit Timetable
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl bg-slate-950 border-white/10 text-white p-0 overflow-hidden shadow-2xl">
                            <DialogHeader className="p-6 pb-2">
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-400" />
                                    Timetable Manager
                                </DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Manage your subjects and weekly class schedule.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="p-6 pt-2">
                                <ClassManager />
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog>
                        <DialogTrigger asChild>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/10 transition-all">
                                <Clock className="w-4 h-4 text-purple-400" />
                                Manage Rotations
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-slate-900 border-white/10 text-white p-0 overflow-hidden">
                            <DialogHeader className="p-6 pb-0 sr-only">
                                <DialogTitle>Manage Rotations</DialogTitle>
                                <DialogDescription>View and manage your current rotation schedules.</DialogDescription>
                            </DialogHeader>
                            <div className="p-6 overflow-y-auto max-h-[80vh]">
                                <RotationManager />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {schedule.conflicts?.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-300">
                        <AlertTriangle className="h-4 w-4" />
                        Scheduling Conflicts ({schedule.conflicts.length})
                    </div>
                    <div className="space-y-1">
                        {schedule.conflicts.map((conflict) => (
                            <p key={conflict.id} className="text-xs text-amber-200">
                                • {conflict.message} ({conflict.startsAt} - {conflict.endsAt})
                            </p>
                        ))}
                    </div>
                </div>
            )}

            {schedule.pauseNotifications && schedule.isHoliday && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    Notifications are paused for this holiday.
                </div>
            )}

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
        </div>
    );
}

function ClassCard({ entry }: { entry: TimetableEntry }) {
    const isLive = (() => {
        if (!entry.startTime || !entry.endTime) return false;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const startParts = entry.startTime.split(':');
        const endParts = entry.endTime.split(':');

        const startH = parseInt(startParts[0] || '0', 10);
        const startM = parseInt(startParts[1] || '0', 10);
        const endH = parseInt(endParts[0] || '0', 10);
        const endM = parseInt(endParts[1] || '0', 10);

        if (isNaN(startH) || isNaN(endH)) return false;

        const startMinutes = startH * 60 + (startM || 0);
        const endMinutes = endH * 60 + (endM || 0);

        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    })();

    return (
        <div className={`bg-white/5 border rounded-xl p-5 transition-all group relative overflow-hidden ${isLive ? 'border-purple-500/50 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20' : 'border-white/10 hover:bg-white/10'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isLive ? 'bg-purple-500 animate-pulse' : ''}`} style={{ backgroundColor: !isLive ? (entry.subject.color || '#A855F7') : undefined }} />

            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-lg text-white">{entry.subject.name}</h3>
                    {isLive && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                            LIVE NOW
                        </span>
                    )}
                </div>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-slate-300">
                    {entry.subject.code}
                </span>
            </div>

            <div className="space-y-2 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isLive ? 'text-purple-400' : 'text-slate-500'}`} />
                    <span className={isLive ? 'text-white font-bold' : ''}>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</span>
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
