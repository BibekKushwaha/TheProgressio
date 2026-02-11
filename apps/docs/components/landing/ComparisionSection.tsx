// components/landing/ComparisonSection.tsx
'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export function ComparisonSection() {
  return (
    <section className="relative pt-16 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            Drowning in Syllabus?
          </h2>
          <p className="text-xl text-slate-400">
            Stop studying hard. Start studying smart.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-gradient-to-br from-red-900/20 to-red-950/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-8"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-full mb-6">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <h3 className="text-2xl font-bold mb-4">The Old Way</h3>
            <ul className="space-y-3 text-slate-300">
              <li>Overwhelming</li>
              <li>Disorganized</li>
              <li>Anxiety-driven</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-gradient-to-br from-green-900/20 to-green-950/10 backdrop-blur-md border border-green-500/20 rounded-2xl p-8"
          >
            <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-6">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>

            <h3 className="text-2xl font-bold mb-4">The Aura Way</h3>
            <ul className="space-y-3 text-slate-300">
              <li>Structured</li>
              <li>Calm</li>
              <li>Laser-focused</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}