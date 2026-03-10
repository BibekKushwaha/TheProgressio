"use client";

import { FileText, Plus, Sparkles, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { addTask, PriorityEnum, TaskStatus, useAppDispatch, useCreateExamMutation, useCreateNoteMutation, useCreateTaskMutation } from '@repo/store';

import { CreateTaskDatePicker } from '@/components/createtask/CreateTaskDatePicker';
import { StartFocusButton } from '@/components/planner/StartFocusButton';
import { TimetableManagerDialog } from '@/components/planner/TimetableManagerDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { buildScheduledIso } from '@/lib/scheduling';
import { toast } from 'sonner';

type SchedulerTab = 'task' | 'exam' | 'class';

function formatScheduleSummary(date: string, time: string) {
    if (!date && !time) return undefined;

    const safeDate = date || new Date().toISOString().slice(0, 10);
    const safeTime = time || '00:00';
    const scheduledAt = new Date(`${safeDate}T${safeTime}`);
    if (Number.isNaN(scheduledAt.getTime())) return undefined;

    return scheduledAt.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function buildCreateTaskHref(params: Record<string, string>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value.trim()) search.set(key, value.trim());
    });
    const query = search.toString();
    return `/createtask${query ? `?${query}` : ''}`;
}

export function QuickActions() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    const [schedulerTab, setSchedulerTab] = useState<SchedulerTab>('task');
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [noteText, setNoteText] = useState('');

    const [taskTitle, setTaskTitle] = useState('');
    const [taskDate, setTaskDate] = useState('');
    const [taskTime, setTaskTime] = useState('');

    const [examTitle, setExamTitle] = useState('');
    const [examDate, setExamDate] = useState('');
    const [examTime, setExamTime] = useState('');
    const [examLocation, setExamLocation] = useState('');
    const [examDuration, setExamDuration] = useState('120');

    const [createNote, { isLoading: isCreatingNote }] = useCreateNoteMutation();
    const [createTask, { isLoading: isCreatingTask }] = useCreateTaskMutation();
    const [createExam, { isLoading: isCreatingExam }] = useCreateExamMutation();

    const actionButtons = [
        {
            label: 'Add New Task',
            icon: Plus,
            onClick: () => router.push('/createtask'),
            className:
                'w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 active:scale-95',
        },
        {
            label: 'New Note',
            icon: FileText,
            onClick: () => setIsNoteDialogOpen(true),
            className:
                'w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 active:scale-95 text-indigo-300 hover:text-indigo-200',
        },
    ];

    const taskEditorHref = useMemo(
        () =>
            buildCreateTaskHref({
                mode: 'task',
                title: taskTitle,
                date: taskDate || (taskTime ? new Date().toISOString().slice(0, 10) : ''),
                time: taskTime,
            }),
        [taskDate, taskTime, taskTitle]
    );

    const examEditorHref = useMemo(
        () =>
            buildCreateTaskHref({
                mode: 'exam',
                title: examTitle,
                date: examDate,
                time: examTime,
                location: examLocation,
                duration: examDuration,
            }),
        [examDate, examDuration, examLocation, examTime, examTitle]
    );

    const handleSaveNote = async () => {
        if (!noteText.trim()) return;

        try {
            await createNote({ content: noteText }).unwrap();
            setIsNoteDialogOpen(false);
            setNoteText('');
            toast.success('Note saved!');
        } catch {
            toast.error('Failed to save note. Please try again.');
        }
    };

    const handleScheduleTask = async () => {
        const title = taskTitle.trim();
        if (!title) return;

        const dueDate = buildScheduledIso(taskDate, taskTime, {
            defaultDateToToday: true,
            defaultTime: '00:00',
        });

        if ((taskDate || taskTime) && !dueDate) {
            toast.error('Please enter a valid task date and time');
            return;
        }

        try {
            const task = await createTask({
                title,
                status: TaskStatus.PENDING,
                priority: PriorityEnum.LOW,
                dueDate: dueDate || undefined,
            }).unwrap();
            dispatch(addTask(task));
            setTaskTitle('');
            setTaskDate('');
            setTaskTime('');

            toast.success('Task scheduled', {
                description: formatScheduleSummary(taskDate, taskTime),
                action: {
                    label: 'Add details',
                    onClick: () => router.push(`/createtask?id=${task.id}`),
                },
            });
        } catch {
            toast.error('Failed to schedule task. Please try again.');
        }
    };

    const handleScheduleExam = async () => {
        const title = examTitle.trim();
        if (!title) return;
        if (!examDate) {
            toast.error('Please pick an exam date');
            return;
        }

        const scheduledDate = buildScheduledIso(examDate, examTime, {
            requireExplicitDate: true,
            defaultTime: '00:00',
        });
        if (!scheduledDate) {
            toast.error('Please enter a valid exam date and time');
            return;
        }

        try {
            await createExam({
                title,
                date: scheduledDate,
                durationMinutes: Number.parseInt(examDuration, 10) || 120,
                location: examLocation.trim() || undefined,
                subjectName: title,
                priority: 'HIGH',
            }).unwrap();

            setExamTitle('');
            setExamDate('');
            setExamTime('');
            setExamLocation('');
            setExamDuration('120');

            toast.success('Exam scheduled', {
                action: {
                    label: 'View Calendar',
                    onClick: () => router.push('/calendar'),
                },
            });
        } catch {
            toast.error('Failed to schedule exam. Please try again.');
        }
    };

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full group-hover:bg-purple-500/20 transition-all duration-700" />

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                Quick Actions
                <Sparkles className="w-5 h-5 text-purple-400 opacity-50" />
            </h2>

            <div className="space-y-4">
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4 space-y-4">
                    <div>
                        <div className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-purple-300/80">Quick Schedule</div>
                        <div className="text-sm text-slate-200">Create a task or exam right from the dashboard, or jump into class scheduling.</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-950/40 p-1">
                        {([
                            { id: 'task', label: 'Task' },
                            { id: 'exam', label: 'Exam' },
                            { id: 'class', label: 'Class' },
                        ] as const).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSchedulerTab(tab.id)}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                    schedulerTab === tab.id
                                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                        : 'text-slate-300 hover:bg-white/5'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {schedulerTab === 'task' && (
                        <div className="space-y-3">
                            <input
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                placeholder="e.g. Revise cell biology for 30 minutes"
                                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <CreateTaskDatePicker value={taskDate} onChange={setTaskDate} />
                                <TimePickerInput value={taskTime || '00:00'} onChange={setTaskTime} className="h-12 bg-white/5 border-white/10 text-white" />
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Button
                                    onClick={() => void handleScheduleTask()}
                                    disabled={!taskTitle.trim() || isCreatingTask}
                                    className="btn-primary w-full sm:w-auto"
                                >
                                    {isCreatingTask ? 'Scheduling…' : 'Schedule Task'}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => router.push(taskEditorHref)}
                                    className="text-xs font-medium text-purple-300 transition-colors hover:text-purple-200"
                                >
                                    Open full editor instead
                                </button>
                            </div>
                        </div>
                    )}

                    {schedulerTab === 'exam' && (
                        <div className="space-y-3">
                            <input
                                value={examTitle}
                                onChange={(e) => setExamTitle(e.target.value)}
                                placeholder="e.g. Physics midterm"
                                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <CreateTaskDatePicker value={examDate} onChange={setExamDate} placeholder="Select exam date" />
                                <TimePickerInput value={examTime || '00:00'} onChange={setExamTime} className="h-12 bg-white/5 border-white/10 text-white" />
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <input
                                    value={examLocation}
                                    onChange={(e) => setExamLocation(e.target.value)}
                                    placeholder="Location (optional)"
                                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                                <input
                                    type="number"
                                    min={1}
                                    value={examDuration}
                                    onChange={(e) => setExamDuration(e.target.value)}
                                    placeholder="Duration (mins)"
                                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Button
                                    onClick={() => void handleScheduleExam()}
                                    disabled={!examTitle.trim() || isCreatingExam}
                                    className="btn-primary w-full sm:w-auto"
                                >
                                    {isCreatingExam ? 'Scheduling…' : 'Schedule Exam'}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => router.push(examEditorHref)}
                                    className="text-xs font-medium text-purple-300 transition-colors hover:text-purple-200"
                                >
                                    Open full editor instead
                                </button>
                            </div>
                        </div>
                    )}

                    {schedulerTab === 'class' && (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-slate-200">
                                Use the existing timetable manager to add subjects, set weekly class slots, and keep the planner in sync.
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <TimetableManagerDialog
                                    trigger={
                                        <Button className="btn-primary w-full sm:w-auto">
                                            <BookOpen className="w-4 h-4 mr-2" />
                                            Open Timetable Manager
                                        </Button>
                                    }
                                />
                                <button
                                    type="button"
                                    onClick={() => router.push('/planner')}
                                    className="text-xs font-medium text-purple-300 transition-colors hover:text-purple-200"
                                >
                                    Go to Planner
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <StartFocusButton isInline={true} />

                <div className="grid grid-cols-2 gap-3">
                    {actionButtons.map((button) => {
                        const Icon = button.icon;
                        return (
                            <button key={button.label} onClick={button.onClick} className={button.className}>
                                <Icon className="w-5 h-5 mb-1" />
                                <span className="text-xs">{button.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold text-xl text-white">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            Quick Note
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Capture a thought, class note, or reminder — saved instantly.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Jot down a quick thought, class note, or reminder..."
                            className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none text-sm leading-relaxed"
                            autoFocus
                        />
                        <Button
                            onClick={handleSaveNote}
                            disabled={!noteText.trim() || isCreatingNote}
                            className="btn-primary w-full"
                        >
                            {isCreatingNote ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Saving…
                                </span>
                            ) : 'Save Note'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
