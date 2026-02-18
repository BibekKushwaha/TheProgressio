// components/landing/ComparisonSection.tsx
'use client';

import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, CheckCircle2, Clock3, Globe2, Layers3 } from 'lucide-react';

type FeatureStatus = 'implemented' | 'partial' | 'planned';

interface FeatureItem {
  name: string;
  detail: string;
  status: FeatureStatus;
}

interface FeatureLayer {
  title: string;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  features: FeatureItem[];
}

const STATUS_STYLES: Record<
  FeatureStatus,
  { label: string; className: string }
> = {
  implemented: {
    label: 'Implemented',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  planned: {
    label: 'Planned',
    className: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  },
};

const FEATURE_LAYERS: FeatureLayer[] = [
  {
    title: 'Standard Activity Tracking',
    subtitle: 'Foundation layer',
    icon: Layers3,
    tone: 'from-cyan-500/20 to-blue-500/5 border-cyan-500/20',
    features: [
      { name: 'Frictionless NLP Quick Capture', detail: 'NLP command bar + smart parser', status: 'implemented' },
      { name: 'Multi-Dimensional Views', detail: 'List + Kanban + timetable + timeline/Gantt views', status: 'implemented' },
      { name: 'Academic Timetable Hub', detail: 'Day/Week rotation manager + resolver', status: 'implemented' },
      { name: 'Manual Habit Logging', detail: 'Habit gallery with check-ins and streaks', status: 'implemented' },
      { name: 'Grade & GPA Tracking', detail: 'Course logging + what-if calculator', status: 'implemented' },
      { name: 'Native Focus Tools', detail: 'Pomodoro and focus session workflows', status: 'implemented' },
    ],
  },
  {
    title: 'AI Academy Advisor',
    subtitle: 'Predictive intelligence layer',
    icon: BrainCircuit,
    tone: 'from-violet-500/20 to-fuchsia-500/5 border-violet-500/20',
    features: [
      { name: 'ML Task Duration Prediction', detail: 'PERT-style duration prediction endpoint', status: 'implemented' },
      { name: 'Predictive Score Indicators', detail: 'Performance forecasting by exam/subject', status: 'implemented' },
      { name: 'Chapter-wise SWOT Analysis', detail: 'Weakness map with chapter priorities', status: 'implemented' },
      { name: 'AI Subtask Scaffolding', detail: 'Break-it-down and AI subtask suggestions', status: 'implemented' },
      { name: 'Asynchronous Habit Automation', detail: 'Category-linked task completion auto-logs habits', status: 'implemented' },
      { name: 'AI Recovery Mode', detail: 'Auto-rebalance overdue workload plan', status: 'implemented' },
    ],
  },
  {
    title: 'Ecosystem & Regional Resilience',
    subtitle: 'Distribution + reliability layer',
    icon: Globe2,
    tone: 'from-emerald-500/20 to-teal-500/5 border-emerald-500/20',
    features: [
      { name: 'WhatsApp Capture & Nudges', detail: 'Webhook capture API + adaptive nudge center', status: 'implemented' },
      { name: 'Local-First Sync Protocol', detail: 'IndexedDB + background sync engine + sync status UI', status: 'implemented' },
      { name: 'Lock-Screen Persistence', detail: 'Live session API + mobile focus bridge contract for lock-screen lifecycle', status: 'implemented' },
      { name: 'Family/Mentor Connect', detail: 'Read-only family connect dashboard', status: 'implemented' },
      { name: 'Syllabus Week Automator', detail: 'Text/image syllabus scan and bulk task creation', status: 'implemented' },
    ],
  },
];

export function ComparisonSection() {
  const sectionIntroMotion = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, ease: 'easeOut' as const },
  };

  return (
    <section className="relative px-6 py-24">
      <div className="max-w-6xl mx-auto">
        <motion.div {...sectionIntroMotion} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Standard Tracker vs AI Advisor
          </h2>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto">
            A direct implementation map of your product stack: what is already live, what is partial, and what is next.
          </p>
        </motion.div>

        <div className="space-y-6">
          {FEATURE_LAYERS.map((layer, index) => {
            const Icon = layer.icon;
            return (
              <motion.div
                key={layer.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
                className={`rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-md ${layer.tone}`}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/10 p-2.5">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{layer.title}</h3>
                      <p className="text-sm text-slate-300">{layer.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {layer.features.map((feature) => {
                    const status = STATUS_STYLES[feature.status];
                    const StatusIcon = feature.status === 'implemented' ? CheckCircle2 : Clock3;
                    return (
                      <div key={feature.name} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white">{feature.name}</p>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.className}`}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{feature.detail}</p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
