"use client";

// components/dashboard/HabitStreaks.tsx
import { Plus, Flame, Loader2, Sparkles } from 'lucide-react';
import { useGetHabitsQuery } from '@repo/store';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export function HabitStreaks() {
    const { data, isLoading } = useGetHabitsQuery();
    const habitsList = data?.habits || [];

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 min-h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-6 h-60 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    Habit Streaks
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                </h2>
                <span className="px-2 py-0.5 bg-purple-500/20 rounded text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    {habitsList.length} Active
                </span>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {habitsList.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-10"
                        >
                            <div className="text-slate-500 text-sm mb-4">No habits started yet</div>
                        </motion.div>
                    ) : (
                        habitsList.slice(0, 5).map((habit, index) => {
                            const streak = habit.currentStreak;
                            const goalProgress = Math.min(100, (streak / 7) * 100);
                            const goalProgressRounded = Math.min(100, Math.round((streak / 7) * 100));

                            return (
                                <motion.div
                                    key={habit.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group relative"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-transform group-hover:scale-110"
                                                style={{ backgroundColor: `${habit.color || '#3B82F6'}20`, color: habit.color || '#3B82F6' }}
                                            >
                                                {habit.icon || '🔥'}
                                            </div>
                                            <div>
                                                <span className="font-semibold block text-slate-100 group-hover:text-purple-400 transition-colors">
                                                    {habit.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                                        Daily Target: {habit.targetValue}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end">
                                            <motion.div
                                                animate={streak > 0 ? {
                                                    scale: [1, 1.2, 1],
                                                    filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
                                                } : {}}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="flex items-center gap-1"
                                            >
                                                <span className={`text-lg font-black ${streak > 0 ? 'text-orange-500' : 'text-slate-600'}`}>
                                                    {streak}
                                                </span>
                                                <Flame
                                                    className={`w-5 h-5 ${streak > 0 ? 'text-orange-500 fill-orange-500' : 'text-slate-600'}`}
                                                />
                                            </motion.div>
                                        </div>
                                    </div>

                                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${goalProgress}%` }}
                                            transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 via-purple-500 to-pink-500 rounded-full"
                                        />
                                    </div>

                                    <div className="mt-2 flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                                        <span>7 Day Goal Progress</span>
                                        <span>{goalProgressRounded}%</span>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            <Link href="/habits" className="mt-6">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm tracking-wide hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 group"
                >
                    <Plus className="w-5 h-5 text-purple-400 group-hover:rotate-90 transition-transform duration-300" />
                    <span>View All Habits</span>
                </motion.button>
            </Link>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(168, 85, 247, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background: rgba(168, 85, 247, 0.3);
                }
            `}</style>
        </div>
    );
}
