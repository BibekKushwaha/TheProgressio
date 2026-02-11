// components/landing/WhatsAppAssistant.tsx
'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Check } from 'lucide-react';

export function WhatsAppAssistant() {
  const messages = [
    { text: 'Explain Thermodynamics Chapter 5', from: 'user' },
    { text: 'Heat Engines (Carnot)...', from: 'ai' },
    { text: 'Generate Quiz', from: 'user' },
  ];

  return (
    <section className="relative pt-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-full mb-6">
              <MessageCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-300">
                WhatsApp Enabled Feature
              </span>
            </div>

            <h2 className="text-5xl font-bold mb-6">
              Your Personal Assistant,
              <br />
              Right in WhatsApp.
            </h2>

            <p className="text-xl text-slate-400 mb-8">
              No new apps to learn. Just text Aura for AI-driven summaries,
              quizzes, and progress updates—all in your favorite messaging app.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold">Aura AI</div>
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Online
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.2, ease: 'easeOut' }}
                  className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                      msg.from === 'user'
                        ? 'bg-purple-600'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.6, ease: 'easeOut' }}
                whileHover={{ scale: 1.02 }}
                className="w-full px-6 py-3 bg-purple-600 rounded-xl font-semibold"
              >
                Start Studying
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}