'use client';

import { motion } from 'framer-motion';

// 7x4 heatmap grid – some cells are "active"
const GRID_COLS = 7;
const GRID_ROWS = 4;
const ACTIVE_CELLS = new Set([1, 2, 4, 8, 9, 10, 13, 16, 17, 18, 22, 23]);

export function StepThree() {
    const cells = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => i);

    return (
        <section className="relative py-24 overflow-hidden">
            {/* Glow accent */}
            <div className="absolute -left-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-900/25 blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* LEFT — Text + Stat Cards */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                        <span className="inline-block text-xs font-bold tracking-[0.25em] uppercase text-sky-400 mb-4">
                            Step 03
                        </span>
                        <h3 className="text-4xl font-extrabold text-white mb-5 leading-tight">
                            Strategic Study
                        </h3>
                        <p className="text-slate-400 text-lg leading-relaxed mb-8">
                            SWOT Mastery Heatmap &amp; AI Study Blocks. We analyze your performance data to find the perfect time for deep work based on your peak energy levels.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Energy Peak</p>
                                <p className="text-2xl font-bold text-white">10:00 AM</p>
                                <div className="mt-2 w-full h-1 bg-gradient-to-r from-sky-500 to-blue-700 rounded-full" />
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Deep Work</p>
                                <p className="text-2xl font-bold text-white">4.5 Hours</p>
                                <div className="mt-2 w-full h-1 bg-gradient-to-r from-cyan-500 to-sky-600 rounded-full" />
                            </div>
                        </div>
                    </motion.div>

                    {/* RIGHT — Heatmap Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                    >
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-5">
                                <h4 className="text-sm font-semibold text-white">Energy vs Mastery Heatmap</h4>
                                <span className="text-xs text-slate-500">Last 7 days</span>
                            </div>

                            {/* Day labels */}
                            <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                    <span key={i} className="text-center text-[10px] text-slate-600">{d}</span>
                                ))}
                            </div>

                            {/* Heatmap grid */}
                            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}>
                                {cells.map((idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.6 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.3, delay: idx * 0.015, ease: 'easeOut' }}
                                        className={`aspect-square rounded-md ${ACTIVE_CELLS.has(idx)
                                            ? 'bg-sky-500/80 shadow-[0_0_8px_rgba(14,165,233,0.5)]'
                                            : 'bg-slate-800/60 border border-white/5'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-xs text-slate-600">Low</span>
                                <div className="flex gap-0.5">
                                    {[10, 20, 40, 60, 80].map((o) => (
                                        <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(14, 165, 233, ${o / 100})` }} />
                                    ))}
                                </div>
                                <span className="text-xs text-slate-600">High</span>
                            </div>

                            {/* Insight bubble */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.5, ease: 'easeOut' }}
                                className="mt-5 flex items-start gap-3 bg-sky-600/10 border border-sky-500/20 rounded-xl px-4 py-3"
                            >
                                <span className="text-sky-400 mt-0.5 flex-shrink-0">💡</span>
                                <p className="text-sm text-slate-300">
                                    <span className="font-semibold text-sky-300">Insight:</span> Your focus peaks at 10 AM. Schedule JEE Math practice then.
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
