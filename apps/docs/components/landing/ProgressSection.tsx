'use client';

import { motion } from 'framer-motion';
import { Trophy, Flame, Clock, Zap } from 'lucide-react';

export function ProgressSection() {
  const stats = [
    {
      icon: Flame,
      value: '21',
      label: 'Day Streak',
      cardTone: 'from-purple-900/30 to-purple-950/20 border-purple-500/20',
      iconTone: 'bg-purple-600/20 text-orange-400',
    },
    {
      icon: Clock,
      value: '156',
      label: 'Hours Studied',
      cardTone: 'from-indigo-900/30 to-indigo-950/20 border-indigo-500/20',
      iconTone: 'bg-indigo-600/20 text-indigo-400',
    },
    {
      icon: Zap,
      value: '3,420',
      label: 'XP Earned',
      cardTone: 'from-pink-900/30 to-pink-950/20 border-pink-500/20',
      iconTone: 'bg-pink-600/20 text-yellow-400',
    },
  ];

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
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.05 }}
                  className={`bg-gradient-to-br ${stat.cardTone} rounded-2xl p-6 border`}
                >
                  <div className={`w-12 h-12 ${stat.iconTone} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </motion.div>
              );
            })}
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
