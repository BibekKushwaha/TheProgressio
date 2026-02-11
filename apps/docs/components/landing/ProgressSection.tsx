'use client';

import { motion } from 'framer-motion';
import { Trophy, Flame, Clock, Zap } from 'lucide-react';

export function ProgressSection() {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            Level Up Your{' '}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Learning
            </span>
          </h2>
          <p className="text-xl text-slate-400">
            Track progress. Earn XP. Build streaks.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="max-w-3xl mx-auto bg-gradient-to-br from-slate-900/80 to-slate-800/60 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-purple-900/30 to-purple-950/20 rounded-2xl p-6 border border-purple-500/20"
            >
              <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-4">
                <Flame className="w-6 h-6 text-orange-400" />
              </div>
              <div className="text-3xl font-bold mb-1">21</div>
              <div className="text-sm text-slate-400">Day Streak</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-indigo-900/30 to-indigo-950/20 rounded-2xl p-6 border border-indigo-500/20"
            >
              <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-3xl font-bold mb-1">156</div>
              <div className="text-sm text-slate-400">Hours Studied</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-pink-900/30 to-pink-950/20 rounded-2xl p-6 border border-pink-500/20"
            >
              <div className="w-12 h-12 bg-pink-600/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold mb-1">3,420</div>
              <div className="text-sm text-slate-400">XP Earned</div>
            </motion.div>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold">Level 12 Scholar</div>
                  <div className="text-sm text-slate-400">2,580 XP to Level 13</div>
                </div>
              </div>
              <div className="text-2xl font-bold">Lvl 12</div>
            </div>

            <div className="relative">
              <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '67%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                />
              </div>
              <motion.div
                initial={{ left: 0 }}
                whileInView={{ left: '67%' }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-lg"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
