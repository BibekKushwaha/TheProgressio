'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const initialTopics = [
    { label: 'Schrödinger Equation Basics', duration: '20m' },
    { label: 'Wave Function Probability', duration: '20m' },
    { label: 'Heisenberg Uncertainty Principle', duration: '20m' },
];

export function StepTwo() {
    const [topics, setTopics] = useState(initialTopics);
    const [isBreakingDown, setIsBreakingDown] = useState(false);

    const handleBreakdown = () => {
        if (isBreakingDown || topics.length > 5) return;

        setIsBreakingDown(true);
        setTimeout(() => {
            setTopics(prev => [
                ...prev,
                { label: 'Quantum Tunneling Intro', duration: '15m' },
                { label: 'Particle in a Box', duration: '15m' },
            ]);
            setIsBreakingDown(false);
        }, 2000);
    };

    return (
        <section className="relative py-24 overflow-hidden">
            {/* Glow accent */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-800/20 blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* LEFT — Topic Breakdown Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        whileHover={{ y: -4 }}
                        className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl min-h-[400px] flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-5 shrink-0">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Topic</p>
                                <h4 className="text-lg font-bold text-white">Quantum Mechanics</h4>
                            </div>
                            <button
                                onClick={handleBreakdown}
                                disabled={isBreakingDown || topics.length > 5}
                                className={`px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95`}
                            >
                                {isBreakingDown ? (
                                    <>
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>✨ {topics.length > 3 ? 'Refined' : 'Break it down'}</>
                                )}
                            </button>
                        </div>

                        <div className="space-y-3 flex-1">
                            <AnimatePresence initial={false}>
                                {topics.map((topic) => (
                                    <motion.div
                                        key={topic.label}
                                        initial={{ opacity: 0, x: -20, height: 0 }}
                                        animate={{ opacity: 1, x: 0, height: 'auto' }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className="flex items-center justify-between bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 overflow-hidden"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                                            <span className="text-sm text-slate-300">{topic.label}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                                            {topic.duration}
                                        </span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {isBreakingDown && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="pt-2 flex justify-center"
                                >
                                    <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse [animation-delay:0.2s]" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse [animation-delay:0.4s]" />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 shrink-0">
                            <span>{topics.length} micro-lessons</span>
                            <span className="text-sky-400 font-bold">
                                Total: {topics.reduce((acc, t) => acc + parseInt(t.duration), 0)} min
                            </span>
                        </div>
                    </motion.div>

                    {/* RIGHT — Text Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
                    >
                        <span className="inline-block text-xs font-bold tracking-[0.25em] uppercase text-sky-400 mb-4">
                            Step 02
                        </span>
                        <h3 className="text-4xl font-extrabold text-white mb-5 leading-tight">
                            AI Scaffolding
                        </h3>
                        <p className="text-slate-400 text-lg leading-relaxed mb-8">
                            Complex topics deconstructed. Our ✨ Break it down! feature takes massive syllabus chunks and turns them into actionable 20-minute sprints.
                        </p>
                        <ul className="space-y-4">
                            {['Micro-learning focus', 'Automatic priority ranking'].map((point) => (
                                <li key={point} className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/40">
                                        <svg className="w-3 h-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </span>
                                    <span className="text-slate-300 font-medium">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
