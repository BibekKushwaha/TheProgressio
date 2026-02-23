'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SCORE = 92;

function CircularScore() {
    const ref = useRef<SVGCircleElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: true });
    const [offset, setOffset] = useState(CIRCUMFERENCE);

    useEffect(() => {
        if (isInView) {
            const target = CIRCUMFERENCE - (SCORE / 100) * CIRCUMFERENCE;
            setOffset(target);
        }
    }, [isInView]);

    return (
        <div ref={containerRef} className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
            <svg width="160" height="160" className="-rotate-90">
                {/* Track */}
                <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                {/* Progress */}
                <circle
                    ref={ref}
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />
                <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white">{SCORE}%</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Predictive</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Score</span>
            </div>
        </div>
    );
}

const subjects = [
    { label: 'Physics', status: 'Strong', color: 'text-green-400', dot: 'bg-green-400' },
    { label: 'Organic Chemistry', status: 'Revision needed', color: 'text-amber-400', dot: 'bg-amber-400' },
];

const hashtags = ['#JEEPrep', '#UPSCsuccess', '#NEET2024'];

export function StepFour() {
    return (
        <section className="relative py-24 overflow-hidden">
            {/* Glow accent */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-sky-900/25 blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* LEFT — Circular Score Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col sm:flex-row items-center gap-8">
                            <CircularScore />

                            <div className="flex-1 space-y-4">
                                {subjects.map((s) => (
                                    <div key={s.label} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3 border border-white/5">
                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                                        <div>
                                            <p className="text-sm font-semibold text-white">{s.label}</p>
                                            <p className={`text-xs ${s.color}`}>{s.status}</p>
                                        </div>
                                    </div>
                                ))}
                                <div className="bg-sky-600/10 border border-sky-500/20 rounded-xl px-4 py-3">
                                    <p className="text-xs text-slate-400">Next revision scheduled in</p>
                                    <p className="text-sm font-bold text-sky-300">2 days · 14 topics</p>
                                </div>
                            </div>
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
                            Step 04
                        </span>
                        <h3 className="text-4xl font-extrabold text-white mb-5 leading-tight">
                            Conquer Exams
                        </h3>
                        <p className="text-slate-400 text-lg leading-relaxed mb-8">
                            Predictive Score Indicator &amp; Revision Scheduler for JEE, NEET, and UPSC. Know exactly where you stand and what to revise before the big day.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {hashtags.map((tag) => (
                                <span
                                    key={tag}
                                    className="px-3 py-1.5 rounded-full border border-sky-500/25 bg-sky-500/10 text-sky-300 text-sm font-semibold"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
