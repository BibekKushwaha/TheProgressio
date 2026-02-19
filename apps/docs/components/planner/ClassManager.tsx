'use client';

import { useState } from 'react';
import {
    useGetDailyScheduleQuery,
    useCreateTimetableEntryMutation,
    useDeleteTimetableEntryMutation,
    useGetSubjectsQuery,
    useCreateSubjectMutation,
    useDeleteSubjectMutation,
    useGetRotationPatternsQuery,
} from '@repo/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, BookOpen, Clock, Calendar, X } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ClassManager() {
    const { data: subjects = [] } = useGetSubjectsQuery();
    const { data: schedule } = useGetDailyScheduleQuery();
    const { data: patterns = [] } = useGetRotationPatternsQuery();
    const [createEntry] = useCreateTimetableEntryMutation();
    const [deleteEntry] = useDeleteTimetableEntryMutation();
    const [createSubject] = useCreateSubjectMutation();
    const [deleteSubject] = useDeleteSubjectMutation();

    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubject, setNewSubject] = useState({ name: '', color: '#3B82F6', room: '', teacher: '' });

    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [newEntry, setNewEntry] = useState({
        dayOfWeek: new Date().getDay(),
        startTime: '09:00',
        endTime: '10:00',
        subjectId: '',
        rotation: '',
    });

    // Available rotation labels from active patterns
    const rotationLabels = Array.from(new Set(patterns.filter(p => p.isActive).flatMap(p => p.pattern)));

    const handleAddSubject = async () => {
        if (!newSubject.name) return;
        try {
            await createSubject(newSubject).unwrap();
            toast.success('Subject added');
            setIsAddingSubject(false);
            setNewSubject({ name: '', color: '#3B82F6', room: '', teacher: '' });
        } catch {
            toast.error('Failed to add subject');
        }
    };

    const handleAddEntry = async () => {
        if (!newEntry.subjectId) {
            toast.error('Please select a subject');
            return;
        }
        try {
            await createEntry({
                ...newEntry,
                dayOfWeek: Number(newEntry.dayOfWeek),
                rotation: newEntry.rotation || null
            }).unwrap();
            toast.success('Class scheduled');
            setIsAddingEntry(false);
        } catch (err) {
            const error = err as { data?: { message?: string } };
            toast.error(error.data?.message || 'Failed to schedule class');
        }
    };

    const handleDeleteEntry = async (id: string) => {
        try {
            await deleteEntry(id).unwrap();
            toast.success('Class removed');
        } catch {
            toast.error('Failed to remove class');
        }
    };

    return (
        <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Subject Management */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-400" />
                        Subjects
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingSubject(!isAddingSubject)}
                        className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                    >
                        {isAddingSubject ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isAddingSubject ? 'Cancel' : 'Add Subject'}
                    </Button>
                </div>

                {isAddingSubject && (
                    <Card className="p-4 bg-white/5 border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">Subject Name</label>
                                <Input
                                    value={newSubject.name}
                                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                    placeholder="e.g. Mathematics"
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">Color</label>
                                <Input
                                    type="color"
                                    value={newSubject.color}
                                    onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                                    className="h-10 bg-black/20 border-white/10 p-1"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">Room (Optional)</label>
                                <Input
                                    value={newSubject.room}
                                    onChange={(e) => setNewSubject({ ...newSubject, room: e.target.value })}
                                    placeholder="e.g. Hall A2"
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">Teacher (Optional)</label>
                                <Input
                                    value={newSubject.teacher}
                                    onChange={(e) => setNewSubject({ ...newSubject, teacher: e.target.value })}
                                    placeholder="e.g. Dr. Smith"
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                        </div>
                        <Button onClick={handleAddSubject} className="w-full bg-indigo-600 hover:bg-indigo-500">
                            Save Subject
                        </Button>
                    </Card>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {subjects.map((sub) => (
                        <div
                            key={sub.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                                <span className="text-sm font-medium text-slate-200">{sub.name}</span>
                            </div>
                            <button
                                onClick={() => deleteSubject(sub.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    {subjects.length === 0 && !isAddingSubject && (
                        <p className="col-span-full text-center py-4 text-xs text-slate-500 italic">
                            No subjects added yet. Add your first subject to start scheduling.
                        </p>
                    )}
                </div>
            </section>

            {/* Timetable Entries */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-emerald-400" />
                        Weekly Timetable
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingEntry(!isAddingEntry)}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        disabled={subjects.length === 0}
                    >
                        {isAddingEntry ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isAddingEntry ? 'Cancel' : 'Schedule Class'}
                    </Button>
                </div>

                {isAddingEntry && (
                    <Card className="p-4 bg-white/5 border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">Day of Week</label>
                                <select
                                    className="w-full bg-black/20 border-white/10 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={newEntry.dayOfWeek}
                                    onChange={(e) => setNewEntry({ ...newEntry, dayOfWeek: parseInt(e.target.value) })}
                                >
                                    {DAYS.map((day, i) => (
                                        <option key={day} value={i} className="bg-slate-900">{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">Subject</label>
                                <select
                                    className="w-full bg-black/20 border-white/10 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={newEntry.subjectId}
                                    onChange={(e) => setNewEntry({ ...newEntry, subjectId: e.target.value })}
                                >
                                    <option value="" className="bg-slate-900">Select Subject</option>
                                    {subjects.map((s) => (
                                        <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">Start Time</label>
                                <Input
                                    type="time"
                                    value={newEntry.startTime}
                                    onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">End Time</label>
                                <Input
                                    type="time"
                                    value={newEntry.endTime}
                                    onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400">Rotation (Optional)</label>
                                <select
                                    className="w-full bg-black/20 border-white/10 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={newEntry.rotation || ''}
                                    onChange={(e) => setNewEntry({ ...newEntry, rotation: e.target.value })}
                                >
                                    <option value="" className="bg-slate-900">Every Week</option>
                                    {rotationLabels.map((r) => (
                                        <option key={r} value={r} className="bg-slate-900">Rotation {r}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button onClick={handleAddEntry} className="w-full bg-emerald-600 hover:bg-emerald-500">
                            Create Class
                        </Button>
                    </Card>
                )}

                <div className="space-y-3">
                    {schedule?.entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 border-l-4"
                            style={{ borderLeftColor: entry.subject.color }}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">{entry.subject.name}</span>
                                    {entry.rotation && (
                                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-slate-400">
                                            Rotation {entry.rotation}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {entry.startTime} - {entry.endTime}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {DAYS[entry.dayOfWeek]}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-red-400 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {schedule?.entries.length === 0 && !isAddingEntry && (
                        <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">No classes scheduled for today.</p>
                            <p className="text-slate-600 text-xs mt-1">Add your weekly schedule to see it here.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
