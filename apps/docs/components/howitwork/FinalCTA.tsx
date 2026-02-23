'use client';
import { selectIsAuthenticated, useAppSelector } from '@repo/store';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export function FinalCTA() {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const router = useRouter();

    return (
        <section className="py-24 px-6">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="max-w-7xl mx-auto"
            >
                <div
                    className="relative overflow-hidden rounded-3xl border border-sky-500/20 px-8 py-20 text-center"
                    style={{
                        background: 'linear-gradient(135deg, rgba(2,132,199,0.35) 0%, rgba(14,165,233,0.25) 50%, rgba(56,189,248,0.15) 100%)',
                        backdropFilter: 'blur(16px)',
                    }}
                >
                    {/* Background glows */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-sky-600/20 blur-[80px]" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-blue-700/20 blur-[60px]" />
                    </div>

                    <div className="relative z-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-5"
                        >
                            Ready to elevate your ambition?
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                            className="text-lg text-slate-300 mb-10 max-w-xl mx-auto"
                        >
                            Join thousands of elite students redefining preparation with TheProgressio.
                        </motion.p>

                        <motion.button
                            onClick={() => isAuthenticated ? router.push('/dashboard') : router.push('/login')}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
                            whileHover={{ scale: 1.06, boxShadow: '0 0 40px rgba(56, 189, 248, 0.5)' }}
                            whileTap={{ scale: 0.97 }}
                            className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-white text-lg transition-all"
                            style={{
                                background: 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%)',
                            }}
                        >
                            Join the Elite
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </motion.button>

                        {/* Social proof */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="mt-8 flex items-center justify-center gap-3 text-slate-400 text-sm"
                        >
                            <div className="flex -space-x-2">
                                {['0ea5e9', '0284c7', '38bdf8'].map((color, i) => (
                                    <div
                                        key={i}
                                        className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white"
                                        style={{ backgroundColor: `#${color}` }}
                                    >
                                        {['A', 'B', 'C'][i]}
                                    </div>
                                ))}
                            </div>
                            <span>2,400+ students already inside</span>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
