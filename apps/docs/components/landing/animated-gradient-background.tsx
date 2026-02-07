'use client';

import { ReactNode } from 'react';

interface AnimatedGradientBackgroundProps {
  children: ReactNode;
}

export default function AnimatedGradientBackground({ children }: AnimatedGradientBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-50 to-blue-50">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 via-violet-400/20 to-blue-400/20 animate-gradient-shift" />
      <div className="absolute inset-0 bg-gradient-to-tl from-blue-400/10 via-violet-400/10 to-indigo-400/10 animate-gradient-shift-reverse" />
      <div className="relative z-10">
        {children}
      </div>
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          33% {
            opacity: 0.8;
            transform: translate(5%, -5%) scale(1.1);
          }
          66% {
            opacity: 0.9;
            transform: translate(-5%, 5%) scale(0.95);
          }
        }
        @keyframes gradient-shift-reverse {
          0%, 100% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          33% {
            opacity: 0.9;
            transform: translate(-5%, 5%) scale(1.05);
          }
          66% {
            opacity: 0.8;
            transform: translate(5%, -5%) scale(0.98);
          }
        }
        .animate-gradient-shift {
          animation: gradient-shift 20s ease-in-out infinite;
          will-change: transform, opacity;
        }
        .animate-gradient-shift-reverse {
          animation: gradient-shift-reverse 25s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-gradient-shift,
          .animate-gradient-shift-reverse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}