// components/landing/LanguageSection.tsx
'use client';

import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

export function LanguageSection() {
  const centerMotion = {
    initial: { opacity: 0, scale: 0.8 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true },
    transition: { duration: 0.6, ease: 'easeOut' as const },
  };
  const textMotion = {
    initial: { opacity: 0, x: 50 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, ease: 'easeOut' as const },
  };

  return (
    <section className="relative pt-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div {...centerMotion} className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full blur-3xl opacity-30"></div>
              <div className="relative w-64 h-64 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 backdrop-blur-md border border-white/20 rounded-full flex flex-col items-center justify-center">
                <Globe className="w-24 h-24 text-purple-400 mb-4" />
                <div className="text-2xl font-bold">हिंदी</div>
              </div>
            </div>
          </motion.div>

          <motion.div {...textMotion}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-full mb-6">
              <Globe className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-300">
                Multilingual AI
              </span>
            </div>

            <h2 className="text-5xl font-bold mb-6">
              Language is No Barrier.
            </h2>

            <p className="text-xl text-slate-400 mb-8">
              Ask in your own language. Our Cloud AI Academic Assistant
              translates seamlessly between Hindi, English, Tamil, Telugu,
              Marathi and more.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}