// app/(dashboard)/createtask/page.tsx
'use client';

import { useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { TaskInputCard } from '@/components/createtask/TaskInputCard';
import { MetaChips } from '@/components/createtask/MetaChips';
import { ExamEntryForm } from '@/components/createtask/ExamEntryForm';
import { TaskDetailsForm } from '@/components/createtask/TaskDetailsForm';
import { Edit, GraduationCap } from 'lucide-react';
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
                            What would you like to capture?
                        </h1>
                        <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
                            Add a focused task or log an exam result in under a minute.
                        </p>
                    </motion.div>

                    {/* ── Mode tabs (hidden in edit mode) ── */}
                    {!form.taskId && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-full max-w-md"
                        >
                            <div
                                role="tablist"
                                aria-label="Create mode"
                                className="grid grid-cols-2 p-1 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-purple-500/10"
                            >
                                {([
                                    { id: 'task', label: 'New Task', icon: Edit },
                                    { id: 'exam', label: 'Exam Mode', icon: GraduationCap },
                                ] as const).map((mode) => {
                                    const isActive = form.entryType === mode.id;
                                    return (
                                        <button
                                            key={mode.id}
                                            role="tab"
                                            aria-selected={isActive}
                                            onClick={() => form.setEntryType(mode.id)}
                                            className={`relative flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
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
                            {/* ── Title input + parsed chips ── */}
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
                                <MetaChips
                                    subject={form.parsedMeta.subject}
                                    date={form.parsedMeta.date}
                                    time={form.parsedMeta.time}
                                    subjectColor={form.matchedCategoryForChip?.colorCode}
                                />
                            </div>

                            {/* ── Mode-specific fields ── */}
                            {form.entryType === 'task' ? (
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
                                />
                            ) : (
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
                                />
                            )}

                            {/* ── Action buttons ── */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
                                            : form.entryType === 'exam'
                                                ? form.examSubMode === 'result'
                                                    ? 'Log Result'
                                                    : 'Schedule Exam'
                                                : 'Create Task'}
                                </button>
                            </div>
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
