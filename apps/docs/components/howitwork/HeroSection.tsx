'use client';

import { motion } from 'framer-motion';

export function HeroSection() {
    return (
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden py-32">
            {/* Radial glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[700px] h-[700px] rounded-full bg-cyan-700/20 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-8"
                >
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-semibold tracking-widest text-cyan-300 uppercase">How It Works</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                    className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-4"
                >
                    Master Your Journey
                </motion.h1>

                <motion.h2
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                    className="text-5xl sm:text-6xl lg:text-7xl font-extrabold italic mb-8"
                    style={{
                        background: 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 0 80px rgba(56, 189, 248, 0.4)',
                    }}
                >
                    in 4 Simple Steps
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
                    className="max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed"
                >
                    A subtle glowing blue TheProgressio surrounds your productivity path. Experience the evolution of high-stakes exam preparation.
                </motion.p>

                {/* Decorative divider */}
                <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.45 }}
                    className="mt-16 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
                />
            </div>
        </section>
    );
}
