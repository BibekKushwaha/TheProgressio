'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Clock, Target, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { useGetRevisionScheduleQuery, type ScheduledBlock } from '@repo/store';

type ExamType = 'JEE' | 'NEET' | 'UPSC' | 'CUSTOM';
type ProblemType = ScheduledBlock['type'];

const EXAM_ROUTINES: Record<ExamType, { hours: number; blocks: { subject: string; duration: number }[] }> = {
    JEE: {
        hours: 8,
        blocks: [
            { subject: 'Physics', duration: 150 },
            { subject: 'Chemistry', duration: 120 },
            { subject: 'Mathematics', duration: 180 },
            { subject: 'Break + Revision', duration: 30 },
        ],
    },
    NEET: {
        hours: 7,
        blocks: [
            { subject: 'Physics', duration: 120 },
            { subject: 'Chemistry', duration: 120 },
            { subject: 'Biology (Botany)', duration: 90 },
            { subject: 'Biology (Zoology)', duration: 90 },
        ],
    },
    UPSC: {
        hours: 8,
        blocks: [
            { subject: 'General Studies', duration: 150 },
            { subject: 'CSAT / Aptitude', duration: 90 },
            { subject: 'Optional Subject', duration: 120 },
            { subject: 'Current Affairs', duration: 60 },
            { subject: 'Essay Practice', duration: 60 },
        ],
    },
    CUSTOM: { hours: 6, blocks: [] },
};

export function RevisionScheduler() {
    const [selectedExam, setSelectedExam] = useState<ExamType>('JEE');
    const { data: scheduleData, isLoading, isError, refetch } = useGetRevisionScheduleQuery(selectedExam);
    const [schedule, setSchedule] = useState<ScheduledBlock[]>([]);
    const [showRoutine, setShowRoutine] = useState(false);

    useEffect(() => {
        // Keep UI in sync with latest server response and clear stale data when empty/error.
        setSchedule((scheduleData?.schedule as ScheduledBlock[] | undefined) ?? []);
    }, [scheduleData]);

    const routine = EXAM_ROUTINES[selectedExam];
    const completed = schedule.filter(s => s.completed).length;
    const total = schedule.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const typeColors: Record<ProblemType, string> = {
        DPP: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        PYQ: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        REVISION: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    const getTypeColor = (type: string) =>
        typeColors[type as ProblemType] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';

    const toggleComplete = (id: string) => {
        setSchedule(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
    };

    return (
        <div className="space-y-6">
            {/* Exam Selector + Routine Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    {(['JEE', 'NEET', 'UPSC', 'CUSTOM'] as ExamType[]).map(exam => (
                        <button
                            key={exam}
                            onClick={() => setSelectedExam(exam)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedExam === exam
                                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                }`}
                        >
                            {exam}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowRoutine(!showRoutine)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                    <Clock className="w-4 h-4" />
                    {showRoutine ? 'Hide' : 'Show'} {routine.hours}hr Batch Routine
                </button>
            </div>

            {/* Coaching Batch Routine */}
            {showRoutine && (
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/5 border border-orange-500/20 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-orange-400" />
                        <h3 className="font-bold text-white">{selectedExam} Coaching Batch Routine — {routine.hours} hrs/day</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {routine.blocks.map((block, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <span className="text-sm text-white font-medium">{block.subject}</span>
                                <span className="text-xs text-orange-400 font-mono">{block.duration} min</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Today's Progress */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                            <CalendarDays className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Today&apos;s Revision Schedule</h3>
                            <p className="text-xs text-slate-400">{completed}/{total} blocks completed</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                    }`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className={`text-sm font-bold ${pct === 100 ? 'text-green-400' : 'text-blue-400'}`}>{pct}%</span>
                    </div>
                </div>

                <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    This is a generated revision plan. Checking items off only updates this local view and does not save progress yet.
                </div>

                {/* Schedule Timeline */}
                <div className="space-y-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-sm text-slate-400">Optimizing schedule from SWOT...</p>
                        </div>
                    ) : isError ? (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                            Couldn&apos;t load revision schedule for {selectedExam}. Try refreshing the suggested plan.
                        </div>
                    ) : schedule.length === 0 ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
                            No schedule blocks available yet. Refresh the suggested plan to generate a new revision run.
                        </div>
                    ) : (
                        schedule.map(block => (
                            <button
                                key={block.id}
                                onClick={() => toggleComplete(block.id)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all text-left ${block.completed
                                        ? 'bg-white/[0.02] opacity-60'
                                        : 'bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${block.completed ? 'bg-green-500 border-green-500' : 'border-white/30'
                                    }`}>
                                    {block.completed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-sm font-bold ${block.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                                            {block.chapter}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-500">{block.subject}</span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getTypeColor(block.type)}`}>
                                    {block.type}
                                </span>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-sm font-mono text-slate-300">{block.time}</div>
                                    <div className="text-xs text-slate-500">{block.duration} min</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Auto-Generate Button */}
                <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl text-sm font-semibold text-indigo-400 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all disabled:opacity-50"
                >
                    <Sparkles className="w-4 h-4" />
                    {isLoading ? "Refreshing..." : "Refresh Suggested Schedule"}
                </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> DPP — Daily Practice Problems</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> PYQ — Previous Year Questions</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> Revision — Weak Topic Review</div>
            </div>
        </div>
    );
}
