'use client';

import type { Subject } from '@repo/store';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimePickerInput } from '@/components/ui/time-picker-input';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ClassEntryFormProps {
    subjects: Subject[] | undefined;
    rotationLabels: string[];
    classDayOfWeek: number;
    setClassDayOfWeek: (v: number) => void;
    classStartTime: string;
    setClassStartTime: (v: string) => void;
    classEndTime: string;
    setClassEndTime: (v: string) => void;
    classRotation: string;
    setClassRotation: (v: string) => void;
    classSubjectId: string;
    setClassSubjectId: (v: string) => void;
    showInlineSubjectCreate: boolean;
    setShowInlineSubjectCreate: (v: boolean) => void;
    newClassSubjectName: string;
    setNewClassSubjectName: (v: string) => void;
    newClassSubjectColor: string;
    setNewClassSubjectColor: (v: string) => void;
    newClassSubjectRoom: string;
    setNewClassSubjectRoom: (v: string) => void;
    newClassSubjectTeacher: string;
    setNewClassSubjectTeacher: (v: string) => void;
    validationErrors?: Record<string, string>;
}

export function ClassEntryForm({
    subjects,
    rotationLabels,
    classDayOfWeek,
    setClassDayOfWeek,
    classStartTime,
    setClassStartTime,
    classEndTime,
    setClassEndTime,
    classRotation,
    setClassRotation,
    classSubjectId,
    setClassSubjectId,
    showInlineSubjectCreate,
    setShowInlineSubjectCreate,
    newClassSubjectName,
    setNewClassSubjectName,
    newClassSubjectColor,
    setNewClassSubjectColor,
    newClassSubjectRoom,
    setNewClassSubjectRoom,
    newClassSubjectTeacher,
    setNewClassSubjectTeacher,
    validationErrors = {},
}: ClassEntryFormProps) {
    const hasSubjects = (subjects?.length ?? 0) > 0;

    return (
        <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="space-y-1">
                <p className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Class Details</p>
                <p className="text-sm text-slate-300">Schedule one weekly class slot and optionally create a new subject inline.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Day of Week</Label>
                    <select
                        value={String(classDayOfWeek)}
                        onChange={(e) => setClassDayOfWeek(Number.parseInt(e.target.value, 10))}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                    >
                        {DAYS.map((day, index) => (
                            <option key={day} value={index} className="text-black">
                                {day}
                            </option>
                        ))}
                    </select>
                    {validationErrors.classDayOfWeek && (
                        <p className="text-[11px] text-rose-400 px-1">{validationErrors.classDayOfWeek}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Rotation (Optional)</Label>
                    <select
                        value={classRotation}
                        onChange={(e) => setClassRotation(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                    >
                        <option value="" className="text-black">Every Week</option>
                        {rotationLabels.map((label) => (
                            <option key={label} value={label} className="text-black">
                                Rotation {label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Start Time</Label>
                    <TimePickerInput
                        value={classStartTime}
                        onChange={setClassStartTime}
                        className="h-12 bg-white/5 border-white/10 text-white"
                    />
                    {validationErrors.classStartTime && (
                        <p className="text-[11px] text-rose-400 px-1">{validationErrors.classStartTime}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">End Time</Label>
                    <TimePickerInput
                        value={classEndTime}
                        onChange={setClassEndTime}
                        className="h-12 bg-white/5 border-white/10 text-white"
                    />
                    {validationErrors.classEndTime && (
                        <p className="text-[11px] text-rose-400 px-1">{validationErrors.classEndTime}</p>
                    )}
                </div>
            </div>

            {validationErrors.classTimeRange && (
                <p className="text-[11px] text-rose-400 px-1">{validationErrors.classTimeRange}</p>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                    <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Subject</Label>
                    <button
                        type="button"
                        onClick={() => setShowInlineSubjectCreate(!showInlineSubjectCreate)}
                        className="text-xs font-medium text-purple-300 hover:text-purple-200 transition-colors"
                    >
                        {showInlineSubjectCreate ? 'Choose existing subject instead' : 'Create new subject instead'}
                    </button>
                </div>

                {!showInlineSubjectCreate && (
                    <>
                        <select
                            value={classSubjectId}
                            onChange={(e) => setClassSubjectId(e.target.value)}
                            disabled={!hasSubjects}
                            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none disabled:opacity-60"
                        >
                            <option value="" className="text-black">
                                {hasSubjects ? 'Select subject' : 'No subjects available'}
                            </option>
                            {subjects?.map((subject) => (
                                <option key={subject.id} value={subject.id} className="text-black">
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                        {validationErrors.classSubject && (
                            <p className="text-[11px] text-rose-400 px-1">{validationErrors.classSubject}</p>
                        )}
                        {!hasSubjects && (
                            <p className="text-[11px] text-slate-500 px-1">Create a subject below to schedule your first class.</p>
                        )}
                    </>
                )}
            </div>

            {showInlineSubjectCreate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
                            Subject Name
                            <span className="text-rose-400 ml-0.5">*</span>
                        </Label>
                        <Input
                            value={newClassSubjectName}
                            onChange={(e) => setNewClassSubjectName(e.target.value)}
                            placeholder="e.g. Mathematics"
                            className="bg-white/5 border-white/10 h-12"
                        />
                        {validationErrors.classSubjectName && (
                            <p className="text-[11px] text-rose-400 px-1">{validationErrors.classSubjectName}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Color</Label>
                        <Input
                            type="color"
                            value={newClassSubjectColor}
                            onChange={(e) => setNewClassSubjectColor(e.target.value)}
                            className="h-12 bg-white/5 border-white/10 p-1"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Room (Optional)</Label>
                        <Input
                            value={newClassSubjectRoom}
                            onChange={(e) => setNewClassSubjectRoom(e.target.value)}
                            placeholder="e.g. Hall A2"
                            className="bg-white/5 border-white/10 h-12"
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-[11px] tracking-[0.14em] uppercase text-slate-400">Teacher (Optional)</Label>
                        <Input
                            value={newClassSubjectTeacher}
                            onChange={(e) => setNewClassSubjectTeacher(e.target.value)}
                            placeholder="e.g. Dr. Smith"
                            className="bg-white/5 border-white/10 h-12"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
