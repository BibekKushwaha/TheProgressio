import React from 'react';
import { NLPCommandBar } from '@/components/planner/NLPCommandBar';
import { SyllabusDigitizer } from '@/components/planner/SyllabusDigitizer';

export default function SyllabusDigitizerPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f1021] to-black text-white selection:bg-cyan-500/30">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <div className="relative flex-1 flex flex-col max-w-7xl mx-auto w-full">
        <div className="px-4 md:px-8 py-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                Syllabus Digitizer
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl font-light leading-relaxed">
                Transform unstructured course documents into actionable tasks.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <NLPCommandBar />
            <SyllabusDigitizer />
          </div>
        </div>
      </div>
    </div>
  );
}
