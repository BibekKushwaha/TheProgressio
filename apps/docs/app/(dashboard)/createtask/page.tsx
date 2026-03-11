// app/(dashboard)/createtask/page.tsx
'use client';

import { useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TaskInputCard } from '@/components/createtask/TaskInputCard';
import { MetaChips } from '@/components/createtask/MetaChips';
import { ExamEntryForm } from '@/components/createtask/ExamEntryForm';
import { ClassEntryForm } from '@/components/createtask/ClassEntryForm';
import { TaskDetailsForm } from '@/components/createtask/TaskDetailsForm';
import { SyllabusTopicSelector } from '@/components/createtask/SyllabusTopicSelector';
import { Edit, GraduationCap, Sparkles, Brain, Calendar, FileText } from 'lucide-react';
import { SyllabusDigitizer } from '@/components/planner/SyllabusDigitizer';
import { useAppSelector, selectAuthStatus, selectCurrentUser } from '@repo/store';
import { useCreateTaskForm } from '@/hooks/useCreateTaskForm';

function CreateTaskPageContent() {
    const router = useRouter();
    const authStatus = useAppSelector(selectAuthStatus);
    const currentUser = useAppSelector(selectCurrentUser);

    useEffect(() => {
        if (authStatus === 'unauthenticated') router.replace('/login');
    }, [authStatus, router]);

    const form = useCreateTaskForm();

    // All hooks above — safe to short-circuit now
    if (
        authStatus === 'unauthenticated' ||
        (!currentUser && authStatus !== 'idle' && authStatus !== 'loading')
    ) {
        return null;
    }

    if (form.taskId && form.isLoadingTask) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white relative overflow-x-hidden selection:bg-purple-500/30 md:pt-3">
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_left,_#7c3aed10,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#4f46e510,_transparent_55%)]" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-2 md:px-8 md:py-4 pb-20 space-y-4">
                {/* ── Header ── */}
                <div className="flex flex-col items-center justify-center space-y-3 pt-0 md:pt-2">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center space-y-3"
                    >
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-purple-200 to-indigo-300 text-transparent bg-clip-text tracking-tight">
                            {form.taskId ? 'Edit Task' : 'What would you like to capture?'}
                        </h1>
                        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                            {form.taskId
                                ? 'Update the details below and save when ready.'
                                : 'Add a focused task, log an exam result, schedule a class slot, or import a syllabus in under a minute.'}
                        </p>
                    </motion.div>

                    {/* ── Mode tabs (hidden in edit mode) ── */}
                    {!form.taskId && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-full max-w-4xl"
                        >
                            <div
                                role="tablist"
                                aria-label="Create mode"
                                className="grid grid-cols-4 p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-purple-500/10"
                            >
                                {([
                                    { id: 'task', label: 'New Task', icon: Edit },
                                    { id: 'exam', label: 'Exam Mode', icon: GraduationCap },
                                    { id: 'class', label: 'Class', icon: Calendar },
                                    { id: 'syllabus', label: 'Syllabus', icon: FileText },
                                ] as const).map((mode) => {
                                    const isActive = form.entryType === mode.id;
                                    return (
                                        <button
                                            key={mode.id}
                                            role="tab"
                                            aria-selected={isActive}
                                            onClick={() => form.setEntryType(mode.id)}
                                            className={`relative flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="active-mode"
                                                    className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-xl shadow-xl shadow-purple-500/30"
                                                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                                />
                                            )}
                                            <mode.icon className="w-4 h-4 relative z-10" />
                                            <span className="relative z-10">{mode.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ── Form panel ── */}
                <div className="max-w-4xl mx-auto w-full">
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={form.entryType}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="panel-surface rounded-4xl p-6 md:p-8 space-y-3"
                        >
                            {form.entryType === 'syllabus' ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <p className="text-[11px] tracking-[0.18em] font-semibold text-purple-300/90 uppercase">
                                            Syllabus Import
                                        </p>
                                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                            <p className="text-base font-semibold text-white">Convert a syllabus into tasks</p>
                                            <p className="text-sm text-slate-400 mt-1">Paste milestones or upload a course document to extract and bulk-create tasks.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <SyllabusDigitizer />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* ── Title input + parsed chips ── */}
                                    {form.entryType === 'class' ? (
                                        <div className="space-y-2">
                                            <p className="text-[11px] tracking-[0.18em] font-semibold text-purple-300/90 uppercase">
                                                Class Schedule
                                            </p>
                                            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                                                <p className="text-base font-semibold text-white">Create a weekly class slot</p>
                                                <p className="text-sm text-slate-400 mt-1">Set the day, time, rotation, and subject details for one recurring class entry.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-[11px] tracking-[0.18em] font-semibold text-purple-300/90 uppercase">
                                                {form.entryType === 'task' ? 'Task Summary' : 'Exam Title / Subject'}
                                            </p>
                                            <TaskInputCard
                                                value={form.taskDescription}
                                                onChange={form.setTaskDescription}
                                                isParsing={form.isSmartCreating || form.isParsingTask}
                                                highlights={[
                                                    ...(form.parsedMeta.subject
                                                        ? [{ text: form.parsedMeta.subject, type: 'subject' as const }]
                                                        : []),
                                                    ...(form.parsedMeta.date
                                                        ? [{ text: form.parsedMeta.date, type: 'date' as const }]
                                                        : []),
                                                    ...(form.parsedMeta.time
                                                        ? [{ text: form.parsedMeta.time, type: 'time' as const }]
                                                        : []),
                                                ]}
                                            />
                                            {form.validationErrors.title && (
                                                <p className="text-xs text-rose-400 px-1">{form.validationErrors.title}</p>
                                            )}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <MetaChips
                                                    subject={form.parsedMeta.subject}
                                                    date={form.parsedMeta.date}
                                                    time={form.parsedMeta.time}
                                                    subjectColor={form.matchedCategoryForChip?.colorCode}
                                                />
                                                {form.parseConfidence === 'parsing' && (
                                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                        <Brain className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                                                        Analyzing…
                                                    </span>
                                                )}
                                                {form.parseConfidence === 'high' && (
                                                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                                                        <Brain className="w-3.5 h-3.5" />
                                                        AI confident
                                                    </span>
                                                )}
                                                {form.parseConfidence === 'low' && (
                                                    <span className="flex items-center gap-1.5 text-[11px] text-amber-400">
                                                        <Brain className="w-3.5 h-3.5" />
                                                        AI partially matched
                                                    </span>
                                                )}
                                                {form.parseConfidence === 'none' && form.taskDescription.trim().length > 5 && (
                                                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        <Brain className="w-3.5 h-3.5" />
                                                        No AI matches
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Mode-specific fields ── */}
                                    {form.entryType === 'task' ? (
                                        <div className="space-y-4">
                                            <TaskDetailsForm
                                                selectedSubjectId={form.selectedSubjectId}
                                                setSelectedSubjectId={form.setSelectedSubjectId}
                                                selectedPriority={form.selectedPriority}
                                                setSelectedPriority={form.setSelectedPriority}
                                                selectedEffort={form.selectedEffort}
                                                setSelectedEffort={form.setSelectedEffort}
                                                description={form.description}
                                                setDescription={form.setDescription}
                                                categories={form.categories}
                                                showManualDetails={form.showManualDetails}
                                                setShowManualDetails={form.setShowManualDetails}
                                                aiSubtaskEnabled={form.aiSubtaskEnabled}
                                                setAiSubtaskEnabled={form.setAiSubtaskEnabled}
                                                isRecurring={form.isRecurring}
                                                setIsRecurring={form.setIsRecurring}
                                                subtasks={form.subtasks}
                                                setSubtasks={form.setSubtasks}
                                                dueDateValue={form.dueDateValue}
                                                dueTimeValue={form.dueTimeValue}
                                                updateDueDateTime={form.updateDueDateTime}
                                                handleGenerateSubtasks={form.handleGenerateSubtasks}
                                                validationErrors={form.validationErrors}
                                            />
                                            {form.selectedSubjectId ? (
                                                <SyllabusTopicSelector
                                                    categoryId={form.selectedSubjectId}
                                                    selectedTopicIds={form.selectedSyllabusTopicIds}
                                                    onChange={form.setSelectedSyllabusTopicIds}
                                                />
                                            ) : null}
                                        </div>
                                    ) : form.entryType === 'exam' ? (
                                        <ExamEntryForm
                                            examSubMode={form.examSubMode}
                                            setExamSubMode={form.setExamSubMode}
                                            selectedExamSubjectId={form.selectedExamSubjectId}
                                            setSelectedExamSubjectId={form.setSelectedExamSubjectId}
                                            subjects={form.subjects}
                                            dueDateValue={form.dueDateValue}
                                            dueTimeValue={form.dueTimeValue}
                                            updateDueDateTime={form.updateDueDateTime}
                                            examType={form.examType}
                                            setExamType={form.setExamType}
                                            obtainedMarks={form.obtainedMarks}
                                            setObtainedMarks={form.setObtainedMarks}
                                            totalMarks={form.totalMarks}
                                            setTotalMarks={form.setTotalMarks}
                                            chapter={form.chapter}
                                            setChapter={form.setChapter}
                                            examLocation={form.examLocation}
                                            setExamLocation={form.setExamLocation}
                                            examDuration={form.examDuration}
                                            setExamDuration={form.setExamDuration}
                                            validationErrors={form.validationErrors}
                                        />
                                    ) : (
                                        <ClassEntryForm
                                            subjects={form.subjects}
                                            rotationLabels={form.rotationLabels}
                                            classDayOfWeek={form.classDayOfWeek}
                                            setClassDayOfWeek={form.setClassDayOfWeek}
                                            classStartTime={form.classStartTime}
                                            setClassStartTime={form.setClassStartTime}
                                            classEndTime={form.classEndTime}
                                            setClassEndTime={form.setClassEndTime}
                                            classRotation={form.classRotation}
                                            setClassRotation={form.setClassRotation}
                                            classSubjectId={form.classSubjectId}
                                            setClassSubjectId={form.setClassSubjectId}
                                            showInlineSubjectCreate={form.showInlineSubjectCreate}
                                            setShowInlineSubjectCreate={form.setShowInlineSubjectCreate}
                                            newClassSubjectName={form.newClassSubjectName}
                                            setNewClassSubjectName={form.setNewClassSubjectName}
                                            newClassSubjectColor={form.newClassSubjectColor}
                                            setNewClassSubjectColor={form.setNewClassSubjectColor}
                                            newClassSubjectRoom={form.newClassSubjectRoom}
                                            setNewClassSubjectRoom={form.setNewClassSubjectRoom}
                                            newClassSubjectTeacher={form.newClassSubjectTeacher}
                                            setNewClassSubjectTeacher={form.setNewClassSubjectTeacher}
                                            validationErrors={form.validationErrors}
                                        />
                                    )}

                                    {/* ── Action buttons ── */}
                                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                                        {/* Smart Create toggle (new task only) */}
                                        {!form.taskId && form.entryType === 'task' && (
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => form.setUseSmartCreate(!form.useSmartCreate)}
                                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${form.useSmartCreate
                                                        ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                                                        }`}
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    Smart Create
                                                </button>
                                                <p className="text-[10px] text-slate-500 px-1">
                                                    {form.useSmartCreate
                                                        ? 'AI will infer all fields automatically'
                                                        : 'Let AI fill subject, dates & priority'}
                                                </p>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 ml-auto">
                                            <button
                                                type="button"
                                                onClick={() => router.back()}
                                                className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={form.handleSaveTask}
                                                disabled={form.isSubmitting}
                                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                            >
                                                {form.isSubmitting
                                                    ? 'Saving…'
                                                    : form.taskId
                                                        ? 'Update Task'
                                                        : form.entryType === 'class'
                                                            ? 'Create Class'
                                                            : form.entryType === 'exam'
                                                                ? form.examSubMode === 'result'
                                                                    ? 'Log Result'
                                                                    : 'Schedule Exam'
                                                                : 'Create Task'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default function CreateTaskPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
                </div>
            }
        >
            <CreateTaskPageContent />
        </Suspense>
    );
}
