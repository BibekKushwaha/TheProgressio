'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen, Target, ChevronRight, ChevronLeft, Sparkles, Check } from 'lucide-react';
import { useCreateCategoryMutation, useUpdateProfileMutation } from '@repo/store';
import { toast } from 'sonner';

const EXAM_TYPES = [
    { label: 'JEE / Engineering', emoji: '⚡' },
    { label: 'NEET / Medical', emoji: '🩺' },
    { label: 'Board Exams', emoji: '📝' },
    { label: 'UPSC / Government', emoji: '🏛️' },
    { label: 'CAT / MBA', emoji: '📊' },
    { label: 'Other Competitive', emoji: '🎯' },
    { label: 'University Semester', emoji: '🎓' },
    { label: 'Self Study', emoji: '📚' },
];

interface OnboardingWizardProps {
    onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const [step, setStep] = useState(0);
    const [selectedExam, setSelectedExam] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [dailyGoal, setDailyGoal] = useState(4);
    const [createCategory] = useCreateCategoryMutation();
    const [updateProfile] = useUpdateProfileMutation();

    const handleFinish = async () => {
        try {
            if (subjectName.trim()) {
                await createCategory({ name: subjectName.trim() }).unwrap();
            }
            await updateProfile({ dailyGoalHours: dailyGoal }).unwrap();
            localStorage.setItem('onboarding-completed', 'true');
            toast.success('You\'re all set! Let\'s start studying 🚀');
            onComplete();
        } catch {
            toast.error('Something went wrong. You can adjust these in Settings later.');
            localStorage.setItem('onboarding-completed', 'true');
            onComplete();
        }
    };

    const steps = [
        {
            title: 'What are you preparing for?',
            subtitle: 'We’ll tailor your dashboard, reminders, and study suggestions around this goal.',
            icon: GraduationCap,
            benefit: 'You’ll see more relevant tasks, nudges, and exam planning shortcuts.',
        },
        {
            title: 'Add your first subject',
            subtitle: 'Subjects make your planner, analytics, and revision flow much easier to organize.',
            icon: BookOpen,
            benefit: 'Even one subject is enough to unlock better planning and cleaner progress tracking.',
        },
        {
            title: 'Set your daily study goal',
            subtitle: 'This gives your dashboard a target so progress, streaks, and focus stats actually mean something.',
            icon: Target,
            benefit: 'Your Command Center will immediately show daily progress instead of generic empty stats.',
        },
    ];

    const currentStep = steps[step];
    const canProceed = step === 0 ? !!selectedExam : step === 1 ? true : true;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-lg mx-4 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden"
            >
                {/* Progress bar */}
                <div className="h-1 bg-white/5">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        animate={{ width: `${((step + 1) / 3) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                </div>

                <div className="p-8">
                    {/* Header */}
                    <div className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-purple-300/70">
                        Your AI study system in 60 seconds
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        {currentStep && <currentStep.icon className="w-6 h-6 text-purple-400" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Step {step + 1} of 3
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{currentStep?.title}</h2>
                    <p className="text-sm text-slate-400 mb-6">{currentStep?.subtitle}</p>
                    <div className="mb-6 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-xs leading-relaxed text-slate-300">
                        <span className="font-semibold text-purple-300">Why this matters:</span> {currentStep?.benefit}
                    </div>

                    {/* Step content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {step === 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {EXAM_TYPES.map((exam) => (
                                        <button
                                            key={exam.label}
                                            onClick={() => setSelectedExam(exam.label)}
                                            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm text-left transition-all ${selectedExam === exam.label
                                                    ? 'bg-purple-500/20 border-purple-500/40 text-white'
                                                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            <span className="text-lg">{exam.emoji}</span>
                                            <span className="font-medium truncate">{exam.label}</span>
                                            {selectedExam === exam.label && (
                                                <Check className="w-4 h-4 text-purple-400 ml-auto shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={subjectName}
                                        onChange={(e) => setSubjectName(e.target.value)}
                                        placeholder="e.g. Physics, Mathematics, Biology..."
                                        autoFocus
                                        className="w-full h-14 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                                    />
                                    <p className="text-xs text-slate-500">
                                        💡 Tip: You can skip this and add subjects from the Subject Library anytime.
                                    </p>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                            {dailyGoal}h
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">hours per day</p>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={12}
                                        value={dailyGoal}
                                        onChange={(e) => setDailyGoal(Number(e.target.value))}
                                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                        <span>Light (1h)</span>
                                        <span>Balanced (4-6h)</span>
                                        <span>Intense (12h)</span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8">
                        {step > 0 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    localStorage.setItem('onboarding-completed', 'true');
                                    onComplete();
                                }}
                                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                Skip for now
                            </button>
                        )}

                        {step < 2 ? (
                            <button
                                onClick={() => setStep(step + 1)}
                                disabled={!canProceed}
                                className="flex items-center gap-1 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Continue <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/20 active:scale-95"
                            >
                                <Sparkles className="w-4 h-4" /> Finish setup
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
