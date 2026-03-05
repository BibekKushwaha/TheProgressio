// components/createtask/ExamEntryForm.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { CreateTaskDatePicker } from '@/components/createtask/CreateTaskDatePicker';
import type { Subject } from '@repo/store';

interface ExamEntryFormProps {
    examSubMode: 'schedule' | 'result';
    setExamSubMode: (v: 'schedule' | 'result') => void;
    selectedExamSubjectId: string;
    setSelectedExamSubjectId: (v: string) => void;
    subjects: Subject[] | undefined;
    dueDateValue: string;
    dueTimeValue: string;
    updateDueDateTime: (nextDate: string, nextTime: string, dateUpdated?: boolean) => void;
    examType: string;
    setExamType: (v: string) => void;
    obtainedMarks: string;
    setObtainedMarks: (v: string) => void;
    totalMarks: string;
    setTotalMarks: (v: string) => void;
    chapter: string;
    setChapter: (v: string) => void;
    examLocation: string;
    setExamLocation: (v: string) => void;
    examDuration: string;
    setExamDuration: (v: string) => void;
}

export function ExamEntryForm({
    examSubMode, setExamSubMode,
    selectedExamSubjectId, setSelectedExamSubjectId,
    subjects,
    dueDateValue, dueTimeValue, updateDueDateTime,
    examType, setExamType,
    obtainedMarks, setObtainedMarks,
    totalMarks, setTotalMarks,
    chapter, setChapter,
    examLocation, setExamLocation,
    examDuration, setExamDuration,
}: ExamEntryFormProps) {
    return (
        <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 mb-2">
                {([
                    { id: 'schedule', label: 'Schedule Exam' },
                    { id: 'result', label: 'Log Result' },
                ] as const).map((sub) => (
                    <button
                        key={sub.id}
                        type="button"
                        onClick={() => setExamSubMode(sub.id)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${examSubMode === sub.id
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {sub.label}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Subject (Optional)</Label>
                <select
                    value={selectedExamSubjectId}
                    onChange={(e) => setSelectedExamSubjectId(e.target.value)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                >
                    <option value="">Select subject</option>
                    {subjects?.map((s) => (
                        <option key={s.id} value={String(s.id)} className="text-black">{s.name}</option>
                    ))}
                </select>
            </div>

            {examSubMode === 'result' ? (
                <>
                    <div className="space-y-2">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Exam Type</Label>
                        <select
                            value={examType}
                            onChange={(e) => setExamType(e.target.value)}
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                        >
                            {['Midterm', 'Final', 'Quiz', 'Assignment', 'UnitTest'].map((t) => (
                                <option key={t} value={t} className="text-black">{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Chapter (Optional)</Label>
                        <Input
                            value={chapter}
                            onChange={(e) => setChapter(e.target.value)}
                            placeholder="e.g. Thermodynamics"
                            className="bg-white/5 border-white/10 h-12"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Marks (Obtained / Total)</Label>
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                            <Input
                                type="number"
                                value={obtainedMarks}
                                onChange={(e) => setObtainedMarks(e.target.value)}
                                placeholder="85"
                                className="bg-white/5 border-white/10 h-12"
                            />
                            <span className="text-slate-400">/</span>
                            <Input
                                type="number"
                                value={totalMarks}
                                onChange={(e) => setTotalMarks(e.target.value)}
                                placeholder="100"
                                className="bg-white/5 border-white/10 h-12"
                            />
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Exam Date</Label>
                            <CreateTaskDatePicker
                                value={dueDateValue}
                                onChange={(nextDate) => updateDueDateTime(nextDate, dueTimeValue, true)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Time</Label>
                            <TimePickerInput
                                value={dueTimeValue}
                                onChange={(nextTime) => updateDueDateTime(dueDateValue, nextTime)}
                                className="h-12 bg-white/5 border-white/10 text-white"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Location</Label>
                            <Input
                                value={examLocation}
                                onChange={(e) => setExamLocation(e.target.value)}
                                placeholder="e.g. Hall A"
                                className="bg-white/5 border-white/10 h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Duration (Mins)</Label>
                            <Input
                                type="number"
                                value={examDuration}
                                onChange={(e) => setExamDuration(e.target.value)}
                                placeholder="180"
                                className="bg-white/5 border-white/10 h-12"
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
