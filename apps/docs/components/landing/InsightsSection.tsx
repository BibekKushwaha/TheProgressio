// components/landing/InsightsSection.tsx
'use client';

import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

export function InsightsSection() {
  const chapters = [
    { name: 'Organic Chemistry', score: 95, color: 'bg-green-500' },
    { name: 'Geometry - Algebra', score: 78, color: 'bg-yellow-500' },
    { name: 'Mechanics (Force and Torque)', score: 45, color: 'bg-red-500' },
    { name: 'Math - Calculus', score: 88, color: 'bg-green-500' },
  ];

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full mb-6">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-300">
                AI-Driven Insights Review
              </span>
            </div>

            <h2 className="text-5xl font-bold mb-6">
              Know Your Weakness
              <br />
              Before The Exam.
            </h2>

            <p className="text-xl text-slate-400">
              Visual dashboards based on your performance. Turn your red zones
              into green circles with AI recommendations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Chapter-wise KPIs</h3>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">
                B+
              </div>
            </div>

            <div className="space-y-4">
              {chapters.map((chapter, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, width: 0 }}
                  whileInView={{ opacity: 1, width: '100%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">{chapter.name}</span>
                    <span className={`text-sm font-semibold ${
                      chapter.score >= 80 ? 'text-green-400' :
                      chapter.score >= 60 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {chapter.score}% Mastery
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${chapter.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
                      className={`h-full ${chapter.color} rounded-full`}
                    ></motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}