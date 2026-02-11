// components/landing/BreakdownSection.tsx
'use client';

import { motion } from 'framer-motion';
import { BookOpen, Award } from 'lucide-react';

export function BreakdownSection() {
  const modules = [
    { name: 'Module 1: Definitions & Principles', progress: 100 },
    { name: 'Module 2: Governance of Institutions', progress: 75 },
    { name: 'Module 3: Civil Service Values', progress: 40 },
  ];

  return (
    <section className="relative pt-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            Break it down
          </h2>
          <p className="text-xl text-slate-400">
            Turn mountains into milestones
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          whileHover={{ y: -10 }}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-3xl mx-auto"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-2">UPSC Ethics Paper</h3>
              <p className="text-slate-400">Your personalized breakdown</p>
            </div>
            <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-yellow-400">High Relevance</span>
            </div>
          </div>

          <div className="space-y-4">
            {modules.map((module, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold">{module.name}</span>
                  </div>
                  <span className="text-sm text-slate-400">{module.progress}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${module.progress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                  ></motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}