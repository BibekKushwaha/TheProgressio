import React from 'react';
import { NLPCommandBar } from '@/components/planner/NLPCommandBar';
import { SyllabusDigitizer } from '@/components/planner/SyllabusDigitizer';

export default function SyllabusDigitizerPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
          Syllabus Digitizer
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl font-light leading-relaxed">
          Transform unstructured course documents into actionable tasks.
        </p>
      </div>

      <div className="space-y-4">
        <NLPCommandBar />
        <SyllabusDigitizer />
      </div>
    </div>
  );
}
