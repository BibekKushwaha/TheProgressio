'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Focus, LayoutDashboard } from 'lucide-react';
import { selectCurrentUser, useAppSelector, useGetActiveLiveSessionQuery } from '@repo/store';
import { useRouter } from 'next/navigation';

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: 'easeOut' as const },
});

const FADE_IN = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.6, delay, ease: 'easeOut' as const },
});

const BUTTON_MOTION = { whileHover: { scale: 1.05 }, whileTap: { scale: 0.98 } };

const FLOAT_CARD = {
  animate: { y: [0, -10, 0] },
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
};

export function HeroSection() {
  const user = useAppSelector(selectCurrentUser);
  const router = useRouter();
  const { data: activeLive } = useGetActiveLiveSessionQuery(undefined, {
    skip: !user,
    pollingInterval: 10000,
  });

  const isLive = !!activeLive?.session;

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6  pb-20">
      <div className="max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' as const }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/10 border border-purple-500/20 rounded-full mb-8"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">
            {isLive ? `Live Session: ${activeLive?.session?.taskTitle}` : 'AI Academic Advisor is Live'}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        >
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            {user ? `Welcome back, ${user.username}.` : 'Conquer the'}
            {' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              {user ? 'Your Peaks await.' : 'Impossible.'}
            </span>
          </h1>
        </motion.div>

        <motion.p
          {...FADE_UP(0.2)}
          className="text-xl text-slate-300 mb-10"
        >
          {user 
            ? "Your predictive AI advisor has updated your daily route based on your latest performance."
            : "India's most advanced AI Academic Advisor for high-stakes exams"
          }
        </motion.p>

        <motion.div
          {...FADE_UP(0.3)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          {user ? (
            <motion.button
              {...BUTTON_MOTION}
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 bg-white text-slate-950 rounded-full font-bold flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all"
            >
              Go to Dashboard
              <LayoutDashboard className="w-5 h-5" />
            </motion.button>
          ) : (
            <motion.button
              {...BUTTON_MOTION}
              onClick={() => router.push('/login')}
              className="px-8 py-4 bg-white text-slate-950 rounded-full font-bold flex items-center gap-2 shadow-xl hover:shadow-2xl transition-all"
            >
              Get Early Access
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          )}

          <motion.button
            {...BUTTON_MOTION}
            onClick={() => router.push(user ? '/reports' : '#')}
            className="px-8 py-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full font-bold flex items-center gap-2 hover:bg-white/10 transition-all"
          >
            <Sparkles className="w-5 h-5 text-purple-400" />
            {user ? 'View Analytics' : 'Powered by AI'}
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
        >
          <motion.div
            {...FLOAT_CARD}
            className={`inline-block bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl ${isLive ? 'border-purple-500/40 bg-purple-500/5' : ''}`}
          >
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isLive ? 'bg-gradient-to-br from-red-500 to-rose-600 animate-pulse' : 'bg-gradient-to-br from-purple-500 to-indigo-600'}`}>
              <Focus className="w-8 h-8" />
            </div>
            <div className={`text-xl font-bold ${isLive ? 'text-rose-400' : ''}`}>
              {isLive ? 'LIVE FOCUS' : 'FOCUS MODE'}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {isLive ? activeLive?.session?.taskTitle : 'ACTIVE SESSION'}
            </div>
          </motion.div>
        </motion.div>

        <motion.p
          {...FADE_IN(0.8)}
          className="mt-12 text-xs text-slate-500 uppercase tracking-wider"
        >
          Trusted by 1 Lakh+ Students Across India
        </motion.p>
      </div>
    </section>
  );
}
